import { describe, it, expect, beforeEach } from 'vitest';
import { writeFileSync, readFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import {
  generateKeypair,
  publicKeyToAddress,
  createKeystore,
  unlockKeystore,
  toHex,
  MockChainProvider,
  SyncEngine,
  DEFAULT_CONFIG,
  sha256,
  encrypt,
  decrypt,
  sign,
} from '../../src/index';
import type { CryptoProvider, SoulchainConfig } from '../../src/index';
import { MockStorageAdapter } from '../../src/storage/mock';

function createTestCrypto(keypair: { publicKey: Uint8Array; secretKey: Uint8Array }): CryptoProvider {
  return {
    encrypt(data: Buffer) {
      const key = Buffer.from(keypair.secretKey.slice(0, 32));
      return encrypt(data, key);
    },
    decrypt(enc) {
      const key = Buffer.from(keypair.secretKey.slice(0, 32));
      return decrypt(enc.ciphertext, key, enc.iv, enc.tag);
    },
    sign(data: Buffer) {
      return toHex(sign(data, keypair.secretKey));
    },
  };
}

describe('Full Flow Integration', () => {
  const tmpDir = join(__dirname, '../../.test-workspace');
  let chain: MockChainProvider;
  let storage: MockStorageAdapter;
  let engine: SyncEngine;
  let keypair: { publicKey: Uint8Array; secretKey: Uint8Array };
  let config: SoulchainConfig;

  beforeEach(() => {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
    mkdirSync(tmpDir, { recursive: true });

    keypair = generateKeypair();
    chain = new MockChainProvider();
    storage = new MockStorageAdapter();
    config = {
      ...DEFAULT_CONFIG,
      chain: 'mock',
      trackedPaths: ['SOUL.md', 'MEMORY.md'],
    };
    const crypto = createTestCrypto(keypair);
    engine = new SyncEngine(config, crypto, storage, chain);
  });

  it('1-2. Generate keypair and create keystore', async () => {
    expect(keypair.publicKey).toHaveLength(32);
    expect(keypair.secretKey.length).toBeGreaterThanOrEqual(32);

    const address = publicKeyToAddress(keypair.publicKey);
    expect(address).toMatch(/^[a-f0-9]+$/);

    const ks = await createKeystore(keypair.secretKey, 'test-pass');
    expect(ks.ciphertext).toBeTruthy();
    expect(ks.version).toBe(1);
    const unlocked = await unlockKeystore(ks, 'test-pass');
    expect(Buffer.from(unlocked).toString('hex')).toEqual(Buffer.from(keypair.secretKey).toString('hex'));
  });

  it('3. Register soul', async () => {
    const tx = await chain.registerSoul();
    expect(tx).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it('4-5. Write SOUL.md and MEMORY.md → encrypt → upload → anchor', async () => {
    const soulContent = Buffer.from('# My Soul\nI am a test soul.');
    const memoryContent = Buffer.from('# Memory\nI remember everything.');

    await engine.onFileWrite('SOUL.md', soulContent);
    await engine.onFileWrite('MEMORY.md', memoryContent);

    // Verify chain has documents
    const soulDoc = await chain.latestDocument(0); // SOUL = 0
    expect(soulDoc).not.toBeNull();
    expect(soulDoc!.contentHash).toBe(sha256(soulContent));

    const memDoc = await chain.latestDocument(1); // MEMORY = 1
    expect(memDoc).not.toBeNull();
    expect(memDoc!.contentHash).toBe(sha256(memoryContent));

    // Verify storage has encrypted data
    expect(soulDoc!.cid).toBeTruthy();
    expect(memDoc!.cid).toBeTruthy();
  });

  it('6-10. Verify integrity, tamper, detect, restore', async () => {
    // Write files to disk and sync
    const soulPath = join(tmpDir, 'SOUL.md');
    const soulContent = Buffer.from('# My Soul\nOriginal content.');
    writeFileSync(soulPath, soulContent);
    await engine.onFileWrite('SOUL.md', soulContent);

    // Verify: chain doc matches
    const doc = await chain.latestDocument(0);
    expect(doc).not.toBeNull();
    expect(doc!.contentHash).toBe(sha256(soulContent));

    // Verify via engine
    const verified = await chain.verifyDocument(0, 0, sha256(soulContent));
    expect(verified).toBe(true);

    // 7-8. Tamper and detect
    const tampered = Buffer.from('# My Soul\nTampered content!');
    const tamperedHash = sha256(tampered);
    const verifyTampered = await chain.verifyDocument(0, 0, tamperedHash);
    expect(verifyTampered).toBe(false);

    // 9-10. Restore from chain
    const restored = await engine.restoreFile('SOUL.md');
    expect(restored.toString()).toBe(soulContent.toString());
  });

  it('11. Version history', async () => {
    const v1 = Buffer.from('Version 1');
    const v2 = Buffer.from('Version 2');
    const v3 = Buffer.from('Version 3');

    await engine.onFileWrite('SOUL.md', v1);
    await engine.onFileWrite('SOUL.md', v2);
    await engine.onFileWrite('SOUL.md', v3);

    const count = await chain.documentCount(0);
    expect(count).toBe(3);

    const doc0 = await chain.documentAt(0, 0);
    expect(doc0!.contentHash).toBe(sha256(v1));

    const doc1 = await chain.documentAt(0, 1);
    expect(doc1!.contentHash).toBe(sha256(v2));

    const doc2 = await chain.documentAt(0, 2);
    expect(doc2!.contentHash).toBe(sha256(v3));

    // Restore specific version
    const restoredV1 = await engine.restoreFile('SOUL.md', 0);
    expect(restoredV1.toString()).toBe('Version 1');
  });

  it('12. Export bundle → import on fresh state → verify', async () => {
    const content = Buffer.from('# Portable Soul');
    await engine.onFileWrite('SOUL.md', content);

    // "Export" = get chain doc + storage data
    const doc = await chain.latestDocument(0);
    expect(doc).not.toBeNull();
    const encryptedData = await storage.download(doc!.cid);

    // "Import" on fresh state
    const chain2 = new MockChainProvider();
    const storage2 = new MockStorageAdapter();
    const engine2 = new SyncEngine(config, createTestCrypto(keypair), storage2, chain2);

    // Re-upload to new storage
    const newCid = await storage2.upload(encryptedData, 'SOUL.md.enc');
    await chain2.writeDocument(0, doc!.contentHash, doc!.encryptedHash, newCid, doc!.signature);

    // Verify on new state
    const newDoc = await chain2.latestDocument(0);
    expect(newDoc!.contentHash).toBe(doc!.contentHash);

    // Restore from new state
    const restored = await engine2.restoreFile('SOUL.md');
    expect(restored.toString()).toBe('# Portable Soul');
  });
});
