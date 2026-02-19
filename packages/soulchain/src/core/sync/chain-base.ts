import type { ChainProvider, DocumentEntry } from './chain';

// Note: ethers v6 is a peer dependency — not bundled in core
// import { ethers } from 'ethers';

export interface BaseChainConfig {
  rpcUrl: string;
  contractAddress: string;
  privateKey: string;
}

const NETWORKS: Record<string, { rpcUrl: string }> = {
  'base': { rpcUrl: 'https://mainnet.base.org' },
  'base-sepolia': { rpcUrl: 'https://sepolia.base.org' },
};

/**
 * Base L2 chain provider using ethers.js v6.
 * Requires ethers as a peer dependency.
 */
export class BaseChainProvider implements ChainProvider {
  private config: BaseChainConfig;
  private provider: any;
  private wallet: any;
  private contract: any;

  constructor(config: BaseChainConfig) {
    this.config = config;
  }

  private async init(): Promise<void> {
    if (this.contract) return;
    // Dynamic import to keep ethers optional
    const { ethers } = await import(/* webpackIgnore: true */ 'ethers' as string);
    this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
    this.wallet = new ethers.Wallet(this.config.privateKey, this.provider);

    // Minimal ABI for SoulRegistry
    const abi = [
      'function registerSoul() external returns (bool)',
      'function writeDocument(uint8 docType, string contentHash, string encryptedHash, string cid, string signature) external',
      'function getLatestDocument(address soul, uint8 docType) external view returns (tuple(uint8 docType, string contentHash, string encryptedHash, string cid, string signature, uint256 version, uint256 timestamp))',
      'function getDocumentAt(address soul, uint8 docType, uint256 version) external view returns (tuple(uint8 docType, string contentHash, string encryptedHash, string cid, string signature, uint256 version, uint256 timestamp))',
      'function getDocumentCount(address soul, uint8 docType) external view returns (uint256)',
      'function grantAccess(address reader, uint8 docType) external',
      'function revokeAccess(address reader, uint8 docType) external',
    ];

    this.contract = new ethers.Contract(this.config.contractAddress, abi, this.wallet);
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

  // Stub implementations for new interface methods (Base provider is legacy, use EVMChainProvider)
  async hasAccess(_agent: string, _reader: string, _docType: number): Promise<boolean> { return false; }
  async registerChild(_child: string): Promise<string> { throw new Error('Use EVMChainProvider for parent/child'); }
  async getChildren(_agent: string): Promise<string[]> { return []; }
  async getParent(_agent: string): Promise<string> { return '0x0000000000000000000000000000000000000000'; }
  async storeAccessKey(_reader: string, _docType: number, _key: Buffer): Promise<string> { throw new Error('Use EVMChainProvider'); }
  async getAccessKey(_owner: string, _reader: string, _docType: number): Promise<Buffer | null> { return null; }
  async removeAccessKey(_reader: string, _docType: number): Promise<string> { throw new Error('Use EVMChainProvider'); }
  async latestDocumentOf(_agent: string, docType: number): Promise<DocumentEntry | null> { return this.latestDocument(docType); }
}

export { NETWORKS as BASE_NETWORKS };
