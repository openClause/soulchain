import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { SoulchainConfig } from '../types/documents';
import { DEFAULT_CONFIG } from './defaults';

export { DEFAULT_CONFIG } from './defaults';

export function loadConfig(workspaceDir: string): SoulchainConfig {
  const jsonPath = join(workspaceDir, 'soulchain.config.json');

  let userConfig: Partial<SoulchainConfig> = {};

  if (existsSync(jsonPath)) {
    const raw = readFileSync(jsonPath, 'utf-8');
    userConfig = JSON.parse(raw);
  }

  const config: SoulchainConfig = {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };

  // Validate
  if (typeof config.chain === 'string') {
    const validChains = ['base', 'base-sepolia', 'localhost', 'arbitrum', 'optimism', 'polygon', 'ethereum', 'mock'];
    if (!validChains.includes(config.chain)) {
      throw new Error(`Invalid chain: ${config.chain}`);
    }
  } else if (typeof config.chain === 'object') {
    if (!['public', 'self-hosted', 'custom'].includes(config.chain.type)) {
      throw new Error(`Invalid chain type: ${config.chain.type}`);
    }
  }
  if (!['ipfs', 'arweave', 'mock'].includes(config.storage)) {
    throw new Error(`Invalid storage: ${config.storage}`);
  }
  if (!config.keystorePath) {
    throw new Error('keystorePath is required');
  }

  return config;
}
