import type { ChainProvider } from './chain';
import type { ChainConfig } from '../types/documents';
/**
 * Create a ChainProvider from a SoulchainConfig chain field.
 * Accepts a string name (e.g. 'base-sepolia', 'mock') or a full ChainConfig object.
 */
export declare function createChainProvider(chain: string | ChainConfig, privateKey?: string): ChainProvider;
//# sourceMappingURL=factory.d.ts.map