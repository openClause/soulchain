import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  generateKeypair,
  MockChainProvider,
  SyncEngine,
  DEFAULT_CONFIG,
  sha256,
  encrypt,
  decrypt,
  sign,
  toHex,
  MockStorageAdapter,
} from '@openclaused/core';
import type { CryptoProvider, SoulchainConfig } from '@openclaused/core';

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

describe('Hook Flow Integration', () => {
  const tmpDir = path.join(__dirname, '../../.test-workspace');
  let chain: MockChainProvider;
  let storage: MockStorageAdapter;
  let engine: SyncEngine;
  let keypair: ReturnType<typeof generateKeypair>;
  let config: SoulchainConfig;

  beforeEach(() => {
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
    fs.mkdirSync(tmpDir, { recursive: true });

    keypair = generateKeypair();
    chain = new MockChainProvider();
    storage = new MockStorageAdapter();
    config = {
      ...DEFAULT_CONFIG,
      chain: 'mock',
      trackedPaths: ['SOUL.md'],
    };
    engine = new SyncEngine(config, createTestCrypto(keypair), storage, chain);
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
  });

  it('simulated hook: file write triggers sync to chain', async () => {
    // Simulate what the hook does: write file, then call engine
    const content = '# My Soul\nHooked write.';
    const filePath = path.join(tmpDir, 'SOUL.md');
    fs.writeFileSync(filePath, content);

    // Hook intercepts and calls engine
    await engine.onFileWrite('SOUL.md', Buffer.from(content));

    // Verify on chain
    const doc = await chain.latestDocument(0);
    expect(doc).not.toBeNull();
    expect(doc!.contentHash).toBe(sha256(Buffer.from(content)));

    // Verify storage has data
    const encrypted = await storage.download(doc!.cid);
    expect(encrypted.length).toBeGreaterThan(0);
  });

  it('simulated hook: unhooked writes do not sync', async () => {
    // Write file without calling engine (simulating uninstalled hook)
    const filePath = path.join(tmpDir, 'SOUL.md');
    fs.writeFileSync(filePath, '# Not tracked anymore');

    // No engine.onFileWrite called

    // Verify NO sync happened
    const doc = await chain.latestDocument(0);
    expect(doc).toBeNull();
  });

  it('simulated hook: multiple writes create version history', async () => {
    await engine.onFileWrite('SOUL.md', Buffer.from('v1'));
    await engine.onFileWrite('SOUL.md', Buffer.from('v2'));

    const count = await chain.documentCount(0);
    expect(count).toBe(2);

    const doc0 = await chain.documentAt(0, 0);
    expect(doc0!.contentHash).toBe(sha256(Buffer.from('v1')));

    const doc1 = await chain.documentAt(0, 1);
    expect(doc1!.contentHash).toBe(sha256(Buffer.from('v2')));
  });

  it('simulated hook: process queue and verify on chain', async () => {
    // Write multiple files
    const writes = ['First write', 'Second write', 'Third write'];
    for (const content of writes) {
      await engine.onFileWrite('SOUL.md', Buffer.from(content));
    }

    // All should be on chain
    const count = await chain.documentCount(0);
    expect(count).toBe(3);

    // Latest should be the last write
    const latest = await chain.latestDocument(0);
    expect(latest!.contentHash).toBe(sha256(Buffer.from('Third write')));

    // Can restore any version
    const restored = await engine.restoreFile('SOUL.md', 0);
    expect(restored.toString()).toBe('First write');
  });
});
