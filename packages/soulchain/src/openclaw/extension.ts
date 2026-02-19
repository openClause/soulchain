import {
  loadConfig,
  unlockKeystore,
  createStorageAdapter,
  MockChainProvider,
  SyncEngine,
} from '../core/index';
import type { Keypair } from '../core/index';
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
    publicKey: new Uint8Array(secretKey.slice(32)),
  };

  // 3. Create engine
  const chain = new MockChainProvider(); // TODO: real chain based on config
  const storage = createStorageAdapter(config);
  const cryptoProvider = createCryptoProvider(keypair);
  engine = new SyncEngine(config, cryptoProvider, storage, chain);

  // 4. Create cache manager
  cacheManager = new CacheManager(workspaceDir);

  // 5. Install hooks (with cache)
  hook = new SoulchainHook(engine, workspaceDir, config.trackedPaths);
  hook.setCache(cacheManager);
  hook.install();

  // 6. Startup restore — pull all tracked files from chain
  await restoreAllFromChain(workspaceDir, config.trackedPaths);

  // 7. Start watcher
  watcher = new FileWatcher(config, engine);
  watcher.start();

  // 8. Verify
  await verifyOnStartup(engine, config);

  console.log('[soulchain] ✅ Extension activated (blockchain-native mode)');
}

/**
 * Startup restore: for every tracked file, pull latest from chain → decrypt → write to local disk.
 * This ensures local files are always a fresh cache of chain state.
 */
async function restoreAllFromChain(workspaceDir: string, trackedPaths: string[]): Promise<void> {
  if (!engine || !cacheManager) return;

  let restored = 0;
  for (const relativePath of trackedPaths) {
    try {
      const content = await engine.restoreFile(relativePath);
      const absolutePath = path.resolve(workspaceDir, relativePath);

      // Ensure directory exists
      const dir = path.dirname(absolutePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      // Write to local cache (use raw fs to avoid triggering write hooks)
      fs.writeFileSync(absolutePath, content);

      // Update cache metadata
      const { sha256 } = require('../core/utils/hash');
      const hash = sha256(content);
      const version = await engine.getLatestVersion(relativePath);
      cacheManager.update(relativePath, hash, version);

      restored++;
    } catch {
      // No chain record yet — that's fine for first run
    }
  }

  if (restored > 0) {
    console.log(`[soulchain] 🔄 Restored ${restored} file(s) from chain`);
  }
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
  cacheManager = null;
  console.log('[soulchain] Extension deactivated');
}

export function getEngine(): SyncEngine | null {
  return engine;
}

export function getCacheManager(): CacheManager | null {
  return cacheManager;
}
