export declare enum SoulDocumentType {
    SOUL = "soul",
    MEMORY = "memory",
    AGENTS = "agents",
    USER = "user",
    DAILY = "daily",
    CHAT = "chat",
    LOVE_MAP = "love_map",
    MUSING = "musing",
    COACHING = "coaching",
    TOOLS = "tools",
    IDENTITY = "identity"
}
export interface DocumentMeta {
    type: SoulDocumentType;
    path: string;
    contentHash: string;
    encryptedHash: string;
    version: number;
    timestamp: string;
    signature: string;
    storageCid?: string;
    chainTxHash?: string;
}
export interface ChainConfig {
    type: 'public' | 'self-hosted' | 'custom';
    name?: string;
    rpcUrl?: string;
    chainId?: number;
    contractAddress?: string;
    autoStart?: boolean;
    dataDir?: string;
    engine?: 'anvil' | 'hardhat';
    port?: number;
    publicAnchor?: {
        enabled: boolean;
        chain: string;
        intervalHours: number;
    };
}
export interface SoulchainConfig {
    chain: string | ChainConfig;
    storage: 'ipfs' | 'arweave' | 'mock';
    keystorePath: string;
    trackedPaths: string[];
    syncMode: 'on-write' | 'interval' | 'manual';
    syncIntervalMs?: number;
}
