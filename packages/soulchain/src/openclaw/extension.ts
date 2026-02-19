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

let hook: SoulchainHook | null = null;
let watcher: FileWatcher | null = null;
let engine: SyncEngine | null = null;

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
  const chain = new MockChainProvider(); // TODO: real chain based on config
  const storage = createStorageAdapter(config);
  const cryptoProvider = createCryptoProvider(keypair);
  engine = new SyncEngine(config, cryptoProvider, storage, chain);

  // 4. Install hooks
  hook = new SoulchainHook(engine, workspaceDir, config.trackedPaths);
  hook.install();

  // 5. Start watcher
  watcher = new FileWatcher(config, engine);
  watcher.start();

  // 6. Verify
  await verifyOnStartup(engine, config);

  console.log('[soulchain] ✅ Extension activated');
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
