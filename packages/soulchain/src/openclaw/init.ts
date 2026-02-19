import * as fs from 'fs';
import * as path from 'path';
import {
  generateKeypair,
  publicKeyToAddress,
  createKeystore,
  toHex,
  createStorageAdapter,
  MockChainProvider,
  MockStorageAdapter,
  createChainProvider,
  SyncEngine,
  DEFAULT_CONFIG,
  sha256,
  SelfHostedChain,
  EVMChainProvider,
  ANVIL_PRIVATE_KEY,
} from '../core/index';
import type { SoulchainConfig, ChainConfig, MigrationReport, CryptoProvider } from '../core/index';
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
  contractAddress?: string;
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

  // 3. Determine chain type
  const isSelfHosted =
    options.chain === 'self-hosted' ||
    (typeof options.chain === 'object' && options.chain.type === 'self-hosted');

  const chainObj = typeof options.chain === 'object' ? options.chain : undefined;
  const selfHostedPort = chainObj?.port ?? 8545;
  const selfHostedEngine = chainObj?.engine ?? 'anvil';

  // 4. Create chain provider
  let chain: any;
  let contractAddress: string | undefined;
  let selfHostedChain: SelfHostedChain | undefined;

  if (isSelfHosted) {
    // Self-hosted: ensure Anvil installed, start it, deploy contract
    selfHostedChain = new SelfHostedChain({
      dataDir: keystoreDir,
      port: selfHostedPort,
      engine: selfHostedEngine,
    });

    // Auto-install Anvil if needed
    await selfHostedChain.ensureAnvil();

    // Start local chain
    await selfHostedChain.start();

    // Deploy contract
    contractAddress = await selfHostedChain.ensureContract();

    // Create EVM provider pointing at local chain
    chain = new EVMChainProvider({
      name: 'Self-hosted',
      rpcUrl: selfHostedChain.getRpcUrl(),
      chainId: 31337,
      contractAddress,
      privateKey: ANVIL_PRIVATE_KEY,
    });
  } else {
    chain = new MockChainProvider();
  }

  // 5. Build config (include contract address for self-hosted)
  const chainConfig: string | ChainConfig = isSelfHosted
    ? {
        type: 'self-hosted' as const,
        port: selfHostedPort,
        engine: selfHostedEngine,
        autoStart: true,
        contractAddress,
      }
    : options.chain;

  const config: SoulchainConfig = {
    ...DEFAULT_CONFIG,
    chain: chainConfig,
    storage: options.storage,
    keystorePath: path.relative(workspaceDir, keystorePath),
  };
  const configPath = path.join(workspaceDir, 'soulchain.config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  // 6. Create engine & register
  const storage = config.storage === 'mock'
    ? new MockStorageAdapter(workspaceDir)
    : createStorageAdapter(config);
  const cryptoProvider = createCryptoProvider(keypair);
  const engine = new SyncEngine(config, cryptoProvider, storage, chain);

  const registrationTx = await chain.registerSoul();

  // 7. Migrate existing files
  let migration: MigrationReport | undefined;
  if (autoMigrate) {
    migration = await engine.migrateExisting(workspaceDir, config.trackedPaths);
  }

  // 8. Stop self-hosted chain (will be restarted on activate)
  if (selfHostedChain) {
    await selfHostedChain.stop();
  }

  return {
    publicKey: pubHex,
    address,
    keystorePath,
    configPath,
    registrationTx,
    migration,
    contractAddress,
  };
}
