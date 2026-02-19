import type { SoulchainConfig } from '../types/documents';
import type { StorageAdapter } from './types';
export type { StorageAdapter } from './types';
export { MockStorageAdapter } from './mock';
export { IpfsStorageAdapter } from './ipfs';
export { ArweaveStorageAdapter } from './arweave';
export interface StorageConfig {
    ipfs?: {
        apiKey: string;
        apiSecret: string;
        gateway?: string;
    };
    arweave?: {
        gateway?: string;
        irysNode?: string;
        privateKey?: string;
    };
}
export declare function createStorageAdapter(config: SoulchainConfig, storageConfig?: StorageConfig): StorageAdapter;
//# sourceMappingURL=index.d.ts.map