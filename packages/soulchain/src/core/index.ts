export { generateKeypair, keypairFromSeed, publicKeyToAddress } from './crypto/keypair';
export type { Keypair } from './crypto/keypair';
export { sign, verify } from './crypto/signing';
export { encrypt, decrypt } from './crypto/encryption';
export type { EncryptedData } from './crypto/encryption';
export { deriveDocumentKey } from './crypto/key-derivation';
export { createKeystore, unlockKeystore } from './crypto/keystore';
export type { KeystoreData } from './crypto/keystore';
export { sha256, contentHash } from './utils/hash';
export { toHex, fromHex, toBase64Url, fromBase64Url } from './utils/encoding';
export { SoulDocumentType } from './types/documents';
export type { DocumentMeta, SoulchainConfig, ChainConfig } from './types/documents';

// Storage
export { createStorageAdapter, MockStorageAdapter, IpfsStorageAdapter, ArweaveStorageAdapter } from './storage';
export type { StorageAdapter, StorageConfig } from './storage';

// Sync
export { SyncEngine, SyncWorker, SyncQueue, MockChainProvider, BaseChainProvider, BASE_NETWORKS, EVMChainProvider, CHAINS, SelfHostedChain, PublicAnchor, createChainProvider } from './sync';
export type { ChainProvider, DocumentEntry, CryptoProvider, IntegrityReport, MigrationReport, SyncStatus, SyncItem, SyncWorkerConfig, BaseChainConfig, EVMChainConfig, SelfHostedConfig, PublicAnchorConfig } from './sync';

// Config
export { loadConfig, DEFAULT_CONFIG } from './config';
