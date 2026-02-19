import {
  loadConfig,
  unlockKeystore,
  createStorageAdapter,
  MockChainProvider,
  SyncEngine,
  sha256,
} from '@openclaused/core';
import type { Keypair } from '@openclaused/core';
import * as fs from 'fs';
import * as path from 'path';
import { SoulchainHook } from './hook';
import { FileWatcher } from './watcher';
import { verifyOnStartup } from './verify';
import { createCryptoProvider } from './crypto-provider';
import { CacheManager } from './cache';

let hook: SoulchainHook | null = null;
let watcher: FileWatcher | null = null;
let engine: SyncEngine | null = null;
let cacheManager: CacheManager | null = null;

export async function activate(workspaceDir: string, passphrase?: string): Promise<void> {
  // 1. Load config
  const config = loadConfig(workspaceDir);

  // 2. Unlock keystore
  const keystorePath = path.resolve(workspaceDir, config.keystorePath);
  const keystoreRaw = JSON.parse(fs.readFileSync(keystorePath, 'utf-8'));
  const pass = passphrase ?? process.env.SOULCHAIN_PASSPHRASE ?? 'soulchain-dev';
  const secretKey = await unlockKeystore(keystoreRaw, pass);

  const keypair: Keypair = {
    secretKey: new Uint8Array(secretKey),
    publicKey: new Uint8Array(secretKey.slice(32)), // Ed25519: last 32 bytes of 64-byte secret = public
  };

  // 3. Create engine
  const chain = new MockChainProvider(workspaceDir); // Persists to .soulchain/mock-chain.json
  // For mock storage, pass workspaceDir so blobs persist to disk
  const storage = config.storage === 'mock'
    ? new (require('@openclaused/core').MockStorageAdapter)(workspaceDir)
    : createStorageAdapter(config);
  const cryptoProvider = createCryptoProvider(keypair);
  engine = new SyncEngine(config, cryptoProvider, storage, chain);

  // 4. Blockchain-native startup: restore ALL tracked files from chain
  cacheManager = new CacheManager(path.join(workspaceDir, '.soulchain'));
  for (const trackedPath of config.trackedPaths) {
    const fullPath = path.resolve(workspaceDir, trackedPath);
    try {
      const restored = await engine.restoreFile(trackedPath);
      if (restored) {
        // Ensure parent directory exists
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(fullPath, restored);
        // Update cache metadata
        const hash = sha256(restored);
        cacheManager.update(trackedPath, hash, 0);
      }
    } catch (e: any) {
      // No chain record yet — file hasn't been synced before, that's fine
      if (!e.message?.includes('No chain record')) {
        console.error(`[soulchain] Failed to restore ${trackedPath}:`, e.message);
      }
    }
  }

  // 5. Install hooks
  hook = new SoulchainHook(engine, workspaceDir, config.trackedPaths);
  hook.install();

  // 6. Start watcher
  watcher = new FileWatcher(config, engine);
  watcher.start();

  // 7. Verify
  await verifyOnStartup(engine, config);

  console.log('[soulchain] ✅ Extension activated (blockchain-native mode)');
}

export async function deactivate(): Promise<void> {
  if (watcher) {
    watcher.stop();
    watcher = null;
  }
  if (hook) {
    hook.uninstall();
    hook = null;
  }
  engine = null;
  console.log('[soulchain] Extension deactivated');
}

export function getEngine(): SyncEngine | null {
  return engine;
}
