import * as fs from 'fs';
import * as path from 'path';
import {
  generateKeypair,
  publicKeyToAddress,
  createKeystore,
  toHex,
  createStorageAdapter,
  MockChainProvider,
  createChainProvider,
  SyncEngine,
  DEFAULT_CONFIG,
  sha256,
} from '@openclaused/core';
import type { SoulchainConfig, ChainConfig, MigrationReport, CryptoProvider } from '@openclaused/core';
import { createCryptoProvider } from './crypto-provider';

export interface InitOptions {
  chain: string | ChainConfig;
  storage: 'ipfs' | 'arweave' | 'mock';
  passphrase?: string;
  autoMigrate?: boolean;
}

export interface InitResult {
  publicKey: string;
  address: string;
  keystorePath: string;
  configPath: string;
  registrationTx?: string;
  migration?: MigrationReport;
}

export async function initSoulchain(
  workspaceDir: string,
  options: InitOptions
): Promise<InitResult> {
  const passphrase = options.passphrase ?? 'soulchain-dev';
  const autoMigrate = options.autoMigrate ?? true;

  // 1. Generate keypair
  const keypair = generateKeypair();
  const pubHex = toHex(keypair.publicKey);
  const address = publicKeyToAddress(keypair.publicKey);

  // 2. Create keystore
  const keystoreDir = path.join(workspaceDir, '.soulchain');
  if (!fs.existsSync(keystoreDir)) {
    fs.mkdirSync(keystoreDir, { recursive: true });
  }
  const keystorePath = path.join(keystoreDir, 'keystore.json');
  const keystoreData = await createKeystore(keypair.secretKey, passphrase);
  fs.writeFileSync(keystorePath, JSON.stringify(keystoreData, null, 2));

  // 3. Create config
  const config: SoulchainConfig = {
    ...DEFAULT_CONFIG,
    chain: options.chain,
    storage: options.storage,
    keystorePath: path.relative(workspaceDir, keystorePath),
  };
  const configPath = path.join(workspaceDir, 'soulchain.config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  // 4. Register on chain
  // Use mock for init (real chain requires funded wallet + deployed contract)
  const chain = new MockChainProvider();
  const storage = createStorageAdapter(config);
  const cryptoProvider = createCryptoProvider(keypair);
  const engine = new SyncEngine(config, cryptoProvider, storage, chain);

  const registrationTx = await chain.registerSoul();

  // 5-6. Migrate existing files
  let migration: MigrationReport | undefined;
  if (autoMigrate) {
    migration = await engine.migrateExisting(workspaceDir, config.trackedPaths);
  }

  return {
    publicKey: pubHex,
    address,
    keystorePath,
    configPath,
    registrationTx,
    migration,
  };
}
