import { describe, it, expect, beforeEach } from 'vitest';
import { SyncEngine, type CryptoProvider } from '../../src/sync/engine';
import { MockStorageAdapter } from '../../src/storage/mock';
import { MockChainProvider } from '../../src/sync/chain-mock';
import { encrypt, decrypt, type EncryptedData } from '../../src/crypto/encryption';
import type { SoulchainConfig } from '../../src/types/documents';
import { writeFileSync, mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Simple crypto provider using a fixed key
const TEST_KEY = new Uint8Array(32).fill(42);
const mockCrypto: CryptoProvider = {
  encrypt: (data: Buffer) => encrypt(data, TEST_KEY),
  decrypt: (enc: EncryptedData) => decrypt(enc.ciphertext, TEST_KEY, enc.iv, enc.tag),
  sign: (_data: Buffer) => 'test-signature',
};

describe('SyncEngine', () => {
  let storage: MockStorageAdapter;
  let chain: MockChainProvider;
  let engine: SyncEngine;
  let config: SoulchainConfig;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'soulchain-engine-'));
    storage = new MockStorageAdapter();
    chain = new MockChainProvider();
    config = {
      chain: 'base-sepolia',
      storage: 'mock',
      keystorePath: join(tmpDir, 'keystore.json'),
      trackedPaths: ['SOUL.md', 'MEMORY.md'],
      syncMode: 'on-write',
    };
    engine = new SyncEngine(config, mockCrypto, storage, chain);
  });

  it('onFileWrite uploads to storage and writes to chain', async () => {
    const content = Buffer.from('my soul document');
    await engine.onFileWrite('SOUL.md', content);

    expect(storage.size).toBe(1);
    expect(await chain.documentCount(0)).toBe(1);
  });

  it('onFileWrite then restoreFile roundtrip', async () => {
    const content = Buffer.from('restore me please');
    await engine.onFileWrite('SOUL.md', content);

    const restored = await engine.restoreFile('SOUL.md');
    expect(restored).toEqual(content);
  });

  it('verifyIntegrity detects tampered files', async () => {
    // Write SOUL.md to chain
    const content = Buffer.from('original');
    await engine.onFileWrite('SOUL.md', content);

    // Create a local file with different content
    const soulPath = join(tmpDir, 'SOUL.md');
    writeFileSync(soulPath, 'tampered');

    // Update config to point to real files
    const localConfig = { ...config, trackedPaths: [soulPath] };
    const localEngine = new SyncEngine(localConfig, mockCrypto, storage, chain);

    // First write with local engine so chain has the path mapping
    await localEngine.onFileWrite(soulPath, content);

    // Now tamper the file
    writeFileSync(soulPath, 'tampered content');

    const report = await localEngine.verifyIntegrity();
    expect(report.tampered.length).toBeGreaterThanOrEqual(1);
  });

  it('verifyIntegrity reports untracked files', async () => {
    // Create local file but don't sync
    const soulPath = join(tmpDir, 'SOUL.md');
    writeFileSync(soulPath, 'unsynced');

    const localConfig = { ...config, trackedPaths: [soulPath] };
    const localEngine = new SyncEngine(localConfig, mockCrypto, storage, chain);

    const report = await localEngine.verifyIntegrity();
    expect(report.untracked).toContain(soulPath);
  });

  it('migrateExisting syncs existing files', async () => {
    writeFileSync(join(tmpDir, 'SOUL.md'), 'soul data');
    writeFileSync(join(tmpDir, 'MEMORY.md'), 'memory data');

    const report = await engine.migrateExisting(tmpDir, ['SOUL.md', 'MEMORY.md']);
    expect(report.filesFound).toBe(2);
    expect(report.filesUploaded).toBe(2);
    expect(report.filesFailed).toHaveLength(0);
    expect(report.totalBytes).toBeGreaterThan(0);
  });

  it('migrateExisting skips missing files', async () => {
    const report = await engine.migrateExisting(tmpDir, ['NONEXISTENT.md']);
    expect(report.filesFound).toBe(0);
  });

  it('status returns current state', () => {
    const s = engine.status();
    expect(s.pendingFiles).toBe(0);
    expect(s.lastSync).toBeNull();
    expect(s.isRunning).toBe(false);
  });
});
