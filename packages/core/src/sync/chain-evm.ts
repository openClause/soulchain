import type { ChainProvider, DocumentEntry } from './chain';

export interface EVMChainConfig {
  name: string;
  rpcUrl: string;
  chainId: number;
  contractAddress?: string;
  explorerUrl?: string;
  privateKey?: string;
}

export const CHAINS: Record<string, EVMChainConfig> = {
  'base': { name: 'Base', rpcUrl: 'https://mainnet.base.org', chainId: 8453, explorerUrl: 'https://basescan.org' },
  'base-sepolia': { name: 'Base Sepolia', rpcUrl: 'https://sepolia.base.org', chainId: 84532, explorerUrl: 'https://sepolia.basescan.org' },
  'arbitrum': { name: 'Arbitrum One', rpcUrl: 'https://arb1.arbitrum.io/rpc', chainId: 42161, explorerUrl: 'https://arbiscan.io' },
  'optimism': { name: 'Optimism', rpcUrl: 'https://mainnet.optimism.io', chainId: 10, explorerUrl: 'https://optimistic.etherscan.io' },
  'polygon': { name: 'Polygon', rpcUrl: 'https://polygon-rpc.com', chainId: 137, explorerUrl: 'https://polygonscan.com' },
  'ethereum': { name: 'Ethereum', rpcUrl: 'https://eth.drpc.org', chainId: 1, explorerUrl: 'https://etherscan.io' },
  'localhost': { name: 'Local', rpcUrl: 'http://127.0.0.1:8545', chainId: 31337 },
};

// Minimal ABI for SoulRegistry contract
const SOUL_REGISTRY_ABI = [
  'function registerSoul() external returns (bool)',
  'function writeDocument(uint8 docType, string contentHash, string encryptedHash, string cid, string signature) external',
  'function getLatestDocument(address soul, uint8 docType) external view returns (tuple(uint8 docType, string contentHash, string encryptedHash, string cid, string signature, uint256 version, uint256 timestamp))',
  'function getDocumentAt(address soul, uint8 docType, uint256 version) external view returns (tuple(uint8 docType, string contentHash, string encryptedHash, string cid, string signature, uint256 version, uint256 timestamp))',
  'function getDocumentCount(address soul, uint8 docType) external view returns (uint256)',
  'function grantAccess(address reader, uint8 docType) external',
  'function revokeAccess(address reader, uint8 docType) external',
];

/**
 * Generic EVM chain provider — works with Base, Arbitrum, Optimism, Polygon, Ethereum, localhost, or any custom EVM.
 * Requires ethers v6 as a peer dependency.
 */
export class EVMChainProvider implements ChainProvider {
  private config: EVMChainConfig;
  private provider: any;
  private wallet: any;
  private contract: any;

  constructor(chainNameOrConfig: string | EVMChainConfig, privateKey?: string) {
    if (typeof chainNameOrConfig === 'string') {
      const preset = CHAINS[chainNameOrConfig];
      if (!preset) throw new Error(`Unknown chain: ${chainNameOrConfig}. Available: ${Object.keys(CHAINS).join(', ')}`);
      this.config = { ...preset, privateKey };
    } else {
      this.config = chainNameOrConfig;
      if (privateKey) this.config.privateKey = privateKey;
    }
  }

  get chainConfig(): EVMChainConfig {
    return this.config;
  }

  private async init(): Promise<void> {
    if (this.contract) return;
    if (!this.config.privateKey) throw new Error('Private key required for chain operations');
    if (!this.config.contractAddress) throw new Error('Contract address required. Deploy first or provide contractAddress.');

    const { ethers } = await import(/* webpackIgnore: true */ 'ethers' as string);
    this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
    this.wallet = new ethers.Wallet(this.config.privateKey, this.provider);
    this.contract = new ethers.Contract(this.config.contractAddress, SOUL_REGISTRY_ABI, this.wallet);
  }

  private toEntry(raw: any): DocumentEntry {
    return {
      docType: Number(raw.docType),
      contentHash: raw.contentHash,
      encryptedHash: raw.encryptedHash,
      cid: raw.cid,
      signature: raw.signature,
      version: Number(raw.version),
      timestamp: Number(raw.timestamp),
    };
  }

  async registerSoul(): Promise<string> {
    await this.init();
    const tx = await this.contract.registerSoul();
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async writeDocument(docType: number, contentHash: string, encryptedHash: string, cid: string, signature: string): Promise<string> {
    await this.init();
    const tx = await this.contract.writeDocument(docType, contentHash, encryptedHash, cid, signature);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async latestDocument(docType: number): Promise<DocumentEntry | null> {
    await this.init();
    try {
      const raw = await this.contract.getLatestDocument(this.wallet.address, docType);
      if (!raw.contentHash) return null;
      return this.toEntry(raw);
    } catch {
      return null;
    }
  }

  async documentAt(docType: number, version: number): Promise<DocumentEntry | null> {
    await this.init();
    try {
      const raw = await this.contract.getDocumentAt(this.wallet.address, docType, version);
      if (!raw.contentHash) return null;
      return this.toEntry(raw);
    } catch {
      return null;
    }
  }

  async documentCount(docType: number): Promise<number> {
    await this.init();
    const count = await this.contract.getDocumentCount(this.wallet.address, docType);
    return Number(count);
  }

  async verifyDocument(docType: number, version: number, expectedHash: string): Promise<boolean> {
    const doc = await this.documentAt(docType, version);
    if (!doc) return false;
    return doc.contentHash === expectedHash;
  }

  async grantAccess(reader: string, docType: number): Promise<string> {
    await this.init();
    const tx = await this.contract.grantAccess(reader, docType);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async revokeAccess(reader: string, docType: number): Promise<string> {
    await this.init();
    const tx = await this.contract.revokeAccess(reader, docType);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  /** Get explorer URL for a transaction */
  txUrl(txHash: string): string | null {
    if (!this.config.explorerUrl) return null;
    return `${this.config.explorerUrl}/tx/${txHash}`;
  }
}
