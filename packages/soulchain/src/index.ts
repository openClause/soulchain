// @openclaused/soulchain — unified entry point
// Re-exports everything from core + openclaw + dashboard

// Core exports
export {
  generateKeypair, keypairFromSeed, publicKeyToAddress,
  sign, verify,
  encrypt, decrypt,
  deriveDocumentKey,
  createKeystore, unlockKeystore,
  sha256, contentHash,
  toHex, fromHex, toBase64Url, fromBase64Url,
  SoulDocumentType,
  createStorageAdapter, MockStorageAdapter, IpfsStorageAdapter, ArweaveStorageAdapter,
  SyncEngine, SyncWorker, SyncQueue, MockChainProvider, BaseChainProvider, BASE_NETWORKS,
  EVMChainProvider, CHAINS, SelfHostedChain, PublicAnchor, createChainProvider,
  loadConfig, DEFAULT_CONFIG,
} from './core/index';

export type {
  Keypair, EncryptedData, KeystoreData, DocumentMeta, SoulchainConfig, ChainConfig,
  StorageAdapter, StorageConfig,
  ChainProvider, DocumentEntry, CryptoProvider, IntegrityReport, MigrationReport,
  SyncStatus, SyncItem, SyncWorkerConfig, BaseChainConfig, EVMChainConfig,
  SelfHostedConfig, PublicAnchorConfig,
} from './core/index';

// OpenClaw integration exports
export {
  SoulchainHook, FileWatcher, verifyOnStartup, initSoulchain,
  activate, deactivate, getEngine, createCryptoProvider,
} from './openclaw/index';

export type { InitOptions, InitResult } from './openclaw/index';

// Dashboard exports
export { VERSION as DASHBOARD_VERSION } from './dashboard/index';
