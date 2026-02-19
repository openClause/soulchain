import type { ChainProvider } from './chain';
import type { ChainConfig } from '../types/documents';
import { MockChainProvider } from './chain-mock';
import { EVMChainProvider, CHAINS } from './chain-evm';

/**
 * Create a ChainProvider from a SoulchainConfig chain field.
 * Accepts a string name (e.g. 'base-sepolia', 'mock') or a full ChainConfig object.
 */
export function createChainProvider(
  chain: string | ChainConfig,
  privateKey?: string
): ChainProvider {
  // Simple string form
  if (typeof chain === 'string') {
    if (chain === 'mock') return new MockChainProvider();
    if (chain in CHAINS) return new EVMChainProvider(chain, privateKey);
    throw new Error(`Unknown chain: ${chain}`);
  }

  // Full config object
  const config = chain;

  if (config.type === 'self-hosted') {
    // Self-hosted uses localhost EVM provider
    const rpcUrl = config.rpcUrl ?? `http://127.0.0.1:${config.port ?? 8545}`;
    return new EVMChainProvider({
      name: config.name ?? 'Self-hosted',
      rpcUrl,
      chainId: config.chainId ?? 31337,
      contractAddress: config.contractAddress,
      privateKey,
    });
  }

  if (config.type === 'custom') {
    if (!config.rpcUrl) throw new Error('Custom chain requires rpcUrl');
    return new EVMChainProvider({
      name: config.name ?? 'Custom',
      rpcUrl: config.rpcUrl,
      chainId: config.chainId ?? 1,
      contractAddress: config.contractAddress,
      privateKey,
    });
  }

  // type === 'public'
  const chainName = config.name ?? 'base-sepolia';
  if (chainName in CHAINS) {
    const preset = CHAINS[chainName];
    return new EVMChainProvider({
      ...preset,
      contractAddress: config.contractAddress ?? preset.contractAddress,
      privateKey,
    });
  }

  throw new Error(`Unknown public chain: ${chainName}`);
}
