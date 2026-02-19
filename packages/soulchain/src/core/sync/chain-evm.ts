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

// Minimal ABI for SoulRegistry contract — matches actual Solidity types
const SOUL_REGISTRY_ABI = [
  'function registerSoul() external',
  'function writeDocument(uint8 docType, bytes32 contentHash, bytes32 encryptedHash, string storageCid, bytes signature) external',
  'function latestDocument(address agent, uint8 docType) external view returns (tuple(bytes32 contentHash, bytes32 encryptedHash, string storageCid, uint8 docType, uint64 timestamp, uint32 version, bytes32 prevHash, bytes signature))',
  'function documentAt(address agent, uint8 docType, uint32 version) external view returns (tuple(bytes32 contentHash, bytes32 encryptedHash, string storageCid, uint8 docType, uint64 timestamp, uint32 version, bytes32 prevHash, bytes signature))',
  'function documentCount(address agent, uint8 docType) external view returns (uint32)',
  'function verifyDocument(address agent, uint8 docType, uint32 version, bytes32 expectedHash) external view returns (bool)',
  'function grantAccess(address reader, uint8 docType) external',
  'function revokeAccess(address reader, uint8 docType) external',
  'function hasAccess(address agent, address reader, uint8 docType) external view returns (bool)',
  'function registerChild(address child) external',
  'function getChildren(address agent) external view returns (address[])',
  'function getParent(address agent) external view returns (address)',
  'function storeAccessKey(address reader, uint8 docType, bytes encryptedKey) external',
  'function getAccessKey(address owner, address reader, uint8 docType) external view returns (bytes)',
  'function removeAccessKey(address reader, uint8 docType) external',
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
  private _address: string = '';

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
    const baseWallet = new ethers.Wallet(this.config.privateKey, this.provider);
    // Wrap in NonceManager to handle concurrent/sequential tx nonces correctly
    this.wallet = new ethers.NonceManager(baseWallet);
    this._address = baseWallet.address;
    this.contract = new ethers.Contract(this.config.contractAddress, SOUL_REGISTRY_ABI, this.wallet);
  }

  private toEntry(raw: any): DocumentEntry {
    return {
      docType: Number(raw.docType),
      contentHash: raw.contentHash, // bytes32 hex string
      encryptedHash: raw.encryptedHash, // bytes32 hex string
      cid: raw.storageCid ?? raw.cid ?? '',
      signature: raw.signature, // bytes hex string
      version: Number(raw.version),
      timestamp: Number(raw.timestamp),
    };
  }

  /** Pad a hex string or plain string to bytes32 */
  private toBytes32(value: string): string {
    // If already 66 chars (0x + 64 hex), return as-is
    if (value.startsWith('0x') && value.length === 66) return value;
    // If hex string without 0x prefix
    if (/^[0-9a-fA-F]{64}$/.test(value)) return '0x' + value;
    // Otherwise, treat as UTF-8 and pad to 32 bytes
    const { ethers } = require('ethers');
    return ethers.encodeBytes32String ? ethers.encodeBytes32String(value.slice(0, 31)) : ethers.zeroPadBytes(ethers.toUtf8Bytes(value.slice(0, 32)), 32);
  }

  async registerSoul(): Promise<string> {
    await this.init();
    const tx = await this.contract.registerSoul();
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async writeDocument(docType: number, contentHash: string, encryptedHash: string, cid: string, signature: string): Promise<string> {
    await this.init();
    const contentBytes32 = this.toBytes32(contentHash);
    const encryptedBytes32 = this.toBytes32(encryptedHash);
    // signature as bytes
    const sigBytes = signature.startsWith('0x') ? signature : '0x' + (signature || '00');
    const tx = await this.contract.writeDocument(docType, contentBytes32, encryptedBytes32, cid, sigBytes);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async latestDocument(docType: number): Promise<DocumentEntry | null> {
    await this.init();
    try {
      const raw = await this.contract.latestDocument(this._address, docType);
      if (!raw.contentHash || raw.contentHash === '0x' + '0'.repeat(64)) return null;
      return this.toEntry(raw);
    } catch {
      return null;
    }
  }

  async documentAt(docType: number, version: number): Promise<DocumentEntry | null> {
    await this.init();
    try {
      const raw = await this.contract.documentAt(this._address, docType, version);
      if (!raw.contentHash || raw.contentHash === '0x' + '0'.repeat(64)) return null;
      return this.toEntry(raw);
    } catch {
      return null;
    }
  }

  async documentCount(docType: number): Promise<number> {
    await this.init();
    const count = await this.contract.documentCount(this._address, docType);
    return Number(count);
  }

  async verifyDocument(docType: number, version: number, expectedHash: string): Promise<boolean> {
    await this.init();
    try {
      const expectedBytes32 = this.toBytes32(expectedHash);
      return await this.contract.verifyDocument(this._address, docType, version, expectedBytes32);
    } catch {
      return false;
    }
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

  async hasAccess(agent: string, reader: string, docType: number): Promise<boolean> {
    await this.init();
    try {
      return await this.contract.hasAccess(agent, reader, docType);
    } catch {
      return false;
    }
  }

  async registerChild(child: string): Promise<string> {
    await this.init();
    const tx = await this.contract.registerChild(child);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async getChildren(agent: string): Promise<string[]> {
    await this.init();
    return await this.contract.getChildren(agent);
  }

  async getParent(agent: string): Promise<string> {
    await this.init();
    return await this.contract.getParent(agent);
  }

  async storeAccessKey(reader: string, docType: number, encryptedKey: Buffer): Promise<string> {
    await this.init();
    const tx = await this.contract.storeAccessKey(reader, docType, '0x' + encryptedKey.toString('hex'));
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async getAccessKey(owner: string, reader: string, docType: number): Promise<Buffer | null> {
    await this.init();
    try {
      const result = await this.contract.getAccessKey(owner, reader, docType);
      if (!result || result === '0x') return null;
      return Buffer.from(result.slice(2), 'hex');
    } catch {
      return null;
    }
  }

  async removeAccessKey(reader: string, docType: number): Promise<string> {
    await this.init();
    const tx = await this.contract.removeAccessKey(reader, docType);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async latestDocumentOf(agent: string, docType: number): Promise<DocumentEntry | null> {
    await this.init();
    try {
      const raw = await this.contract.latestDocument(agent, docType);
      if (!raw.contentHash || raw.contentHash === '0x' + '0'.repeat(64)) return null;
      return this.toEntry(raw);
    } catch {
      return null;
    }
  }

  /** Get explorer URL for a transaction */
  txUrl(txHash: string): string | null {
    if (!this.config.explorerUrl) return null;
    return `${this.config.explorerUrl}/tx/${txHash}`;
  }
}
