import type { SoulchainConfig } from '../types/documents';

export const DEFAULT_CONFIG: SoulchainConfig = {
  chain: {
    type: 'public',
    name: 'base-sepolia',
  },
  storage: 'mock',
  keystorePath: '~/.soulchain/keystore.json',
  trackedPaths: [
    'SOUL.md',
    'MEMORY.md',
    'AGENTS.md',
    'USER.md',
  ],
  syncMode: 'on-write',
  syncIntervalMs: 5000,
};
