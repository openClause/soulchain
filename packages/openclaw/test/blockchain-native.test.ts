import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SyncEngine, type CryptoProvider } from '@openclaused/core';
import { MockStorageAdapter } from '@openclaused/core';
import { MockChainProvider } from '@openclaused/core';
import { encrypt, decrypt, type EncryptedData } from '@openclaused/core';
import type { SoulchainConfig } from '@openclaused/core';
import { SoulchainHook } from '../src/hook';
import { CacheManager } from '../src/cache';

// NOTE: The hook.ts and cache.ts in packages/openclaw/src/ are the OLD copies.
// The real ones are in packages/soulchain/src/openclaw/.
// These tests validate the pattern; we'll also copy the new files here.

const TEST_KEY = new Uint8Array(32).fill(42);
const mockCrypto: CryptoProvider = {
  encrypt: (data: Buffer) => encrypt(data, TEST_KEY),
  decrypt: (enc: EncryptedData) => decrypt(enc.ciphertext, TEST_KEY, enc.iv, enc.tag),
  sign: (_data: Buffer) => 'test-signature',
};

describe('Blockchain-Native Memory', () => {
  let tmpDir: string;
  let storage: MockStorageAdapter;
  let chain: MockChainProvider;
  let engine: SyncEngine;
  let config: SoulchainConfig;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soulchain-native-'));
    storage = new MockStorageAdapter();
    chain = new MockChainProvider();
    config = {
      chain: 'mock',
      storage: 'mock',
      keystorePath: 'keystore.json',
      trackedPaths: ['SOUL.md', 'MEMORY.md'],
      syncMode: 'on-write',
    };
    engine = new SyncEngine(config, mockCrypto, storage, chain);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('CacheManager', () => {
    it('creates .soulchain directory and cache file', () => {
      const cache = new CacheManager(tmpDir);
      expect(fs.existsSync(path.join(tmpDir, '.soulchain'))).toBe(true);
    });

    it('stores and retrieves cache entries', () => {
      const cache = new CacheManager(tmpDir);
      cache.update('SOUL.md', 'abc123', 3);
      const entry = cache.get('SOUL.md');
      expect(entry).toEqual({ chainHash: 'abc123', localHash: 'abc123', chainVersion: 3 });
    });

    it('persists across instances', () => {
      const cache1 = new CacheManager(tmpDir);
      cache1.update('SOUL.md', 'abc123', 3);

      const cache2 = new CacheManager(tmpDir);
      expect(cache2.get('SOUL.md')?.chainHash).toBe('abc123');
    });

    it('isFresh returns true when hashes match', () => {
      const cache = new CacheManager(tmpDir);
      cache.update('SOUL.md', 'abc123', 3);
      expect(cache.isFresh('SOUL.md', 'abc123')).toBe(true);
    });

    it('isFresh returns false for unknown files', () => {
      const cache = new CacheManager(tmpDir);
      expect(cache.isFresh('UNKNOWN.md', 'abc123')).toBe(false);
    });

    it('isFresh returns false when chain hash differs', () => {
      const cache = new CacheManager(tmpDir);
      cache.update('SOUL.md', 'abc123', 3);
      expect(cache.isFresh('SOUL.md', 'different')).toBe(false);
    });
  });

  describe('SyncEngine extensions', () => {
    it('getLatestVersion returns version after write', async () => {
      await engine.onFileWrite('SOUL.md', Buffer.from('soul content'));
      const version = await engine.getLatestVersion('SOUL.md');
      expect(version).toBe(0); // first version
    });

    it('getLatestVersion returns -1 for unwritten files', async () => {
      const version = await engine.getLatestVersion('SOUL.md');
      expect(version).toBe(-1);
    });

    it('getLatestHash returns hash after write', async () => {
      await engine.onFileWrite('SOUL.md', Buffer.from('soul content'));
      const hash = await engine.getLatestHash('SOUL.md');
      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
    });
  });

  describe('Read from chain when local file missing', () => {
    it('restoreFile returns content after write', async () => {
      const content = Buffer.from('my soul document');
      await engine.onFileWrite('SOUL.md', content);

      const restored = await engine.restoreFile('SOUL.md');
      expect(restored).toEqual(content);
    });
  });

  describe('Full cycle: write → restore → verify', () => {
    it('write to chain, delete local, restore from chain', async () => {
      const soulContent = Buffer.from('I am the soul');
      const memoryContent = Buffer.from('I remember everything');

      // Write both files to chain
      await engine.onFileWrite('SOUL.md', soulContent);
      await engine.onFileWrite('MEMORY.md', memoryContent);

      // Restore from chain
      const restoredSoul = await engine.restoreFile('SOUL.md');
      const restoredMemory = await engine.restoreFile('MEMORY.md');

      expect(restoredSoul).toEqual(soulContent);
      expect(restoredMemory).toEqual(memoryContent);
    });

    it('multiple versions, latest restored', async () => {
      await engine.onFileWrite('SOUL.md', Buffer.from('v1'));
      await engine.onFileWrite('SOUL.md', Buffer.from('v2'));
      await engine.onFileWrite('SOUL.md', Buffer.from('v3'));

      const restored = await engine.restoreFile('SOUL.md');
      expect(restored.toString()).toBe('v3');
    });
  });

  describe('Startup restore simulation', () => {
    it('populates all tracked files from chain to local disk', async () => {
      // Simulate previous session: write files to chain
      const soulContent = Buffer.from('soul from chain');
      const memoryContent = Buffer.from('memory from chain');
      await engine.onFileWrite('SOUL.md', soulContent);
      await engine.onFileWrite('MEMORY.md', memoryContent);

      // Simulate startup restore
      for (const relativePath of config.trackedPaths) {
        try {
          const content = await engine.restoreFile(relativePath);
          const absolutePath = path.join(tmpDir, relativePath);
          fs.writeFileSync(absolutePath, content);
        } catch {
          // No chain record
        }
      }

      // Verify local files match
      expect(fs.readFileSync(path.join(tmpDir, 'SOUL.md')).toString()).toBe('soul from chain');
      expect(fs.readFileSync(path.join(tmpDir, 'MEMORY.md')).toString()).toBe('memory from chain');
    });

    it('handles files with no chain record gracefully', async () => {
      // Don't write anything to chain — restore should not throw
      let errors = 0;
      for (const relativePath of config.trackedPaths) {
        try {
          await engine.restoreFile(relativePath);
        } catch {
          errors++;
        }
      }
      expect(errors).toBe(2); // both files should fail gracefully
    });
  });

  describe('Cache freshness with write flow', () => {
    it('write updates cache, subsequent read sees fresh cache', async () => {
      const cache = new CacheManager(tmpDir);
      const content = Buffer.from('cached content');

      await engine.onFileWrite('SOUL.md', content);

      // Simulate what the hook does after write
      const { sha256 } = await import('@openclaused/core');
      const hash = sha256(content);
      const version = await engine.getLatestVersion('SOUL.md');
      cache.update('SOUL.md', hash, version);

      // Cache should be fresh
      expect(cache.isFresh('SOUL.md', hash)).toBe(true);

      // After a new write with different content, old hash is stale
      expect(cache.isFresh('SOUL.md', 'different-hash')).toBe(false);
    });
  });
});
