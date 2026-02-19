import type { SoulchainConfig } from '../types/documents';
import type { StorageAdapter } from './types';
import { MockStorageAdapter } from './mock';
import { IpfsStorageAdapter } from './ipfs';
import { ArweaveStorageAdapter } from './arweave';

export type { StorageAdapter } from './types';
export { MockStorageAdapter } from './mock';
export { IpfsStorageAdapter } from './ipfs';
export { ArweaveStorageAdapter } from './arweave';

export interface StorageConfig {
  ipfs?: { apiKey: string; apiSecret: string; gateway?: string };
  arweave?: { gateway?: string; irysNode?: string; privateKey?: string };
}

export function createStorageAdapter(config: SoulchainConfig, storageConfig?: StorageConfig): StorageAdapter {
  switch (config.storage) {
    case 'ipfs':
      if (!storageConfig?.ipfs) throw new Error('IPFS config required (apiKey, apiSecret)');
      return new IpfsStorageAdapter(storageConfig.ipfs);
    case 'arweave':
      return new ArweaveStorageAdapter(storageConfig?.arweave);
    case 'mock':
      return new MockStorageAdapter();
    default:
      throw new Error(`Unknown storage type: ${config.storage}`);
  }
}
