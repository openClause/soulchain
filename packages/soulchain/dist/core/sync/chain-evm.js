"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMChainProvider = exports.CHAINS = void 0;
exports.CHAINS = {
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
class EVMChainProvider {
    constructor(chainNameOrConfig, privateKey) {
        if (typeof chainNameOrConfig === 'string') {
            const preset = exports.CHAINS[chainNameOrConfig];
            if (!preset)
                throw new Error(`Unknown chain: ${chainNameOrConfig}. Available: ${Object.keys(exports.CHAINS).join(', ')}`);
            this.config = { ...preset, privateKey };
        }
        else {
            this.config = chainNameOrConfig;
            if (privateKey)
                this.config.privateKey = privateKey;
        }
    }
    get chainConfig() {
        return this.config;
    }
    async init() {
        if (this.contract)
            return;
        if (!this.config.privateKey)
            throw new Error('Private key required for chain operations');
        if (!this.config.contractAddress)
            throw new Error('Contract address required. Deploy first or provide contractAddress.');
        const { ethers } = await Promise.resolve(`${'ethers'}`).then(s => __importStar(require(s)));
        this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
        this.wallet = new ethers.Wallet(this.config.privateKey, this.provider);
        this.contract = new ethers.Contract(this.config.contractAddress, SOUL_REGISTRY_ABI, this.wallet);
    }
    toEntry(raw) {
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
    async registerSoul() {
        await this.init();
        const tx = await this.contract.registerSoul();
        const receipt = await tx.wait();
        return receipt.hash;
    }
    async writeDocument(docType, contentHash, encryptedHash, cid, signature) {
        await this.init();
        const tx = await this.contract.writeDocument(docType, contentHash, encryptedHash, cid, signature);
        const receipt = await tx.wait();
        return receipt.hash;
    }
    async latestDocument(docType) {
        await this.init();
        try {
            const raw = await this.contract.getLatestDocument(this.wallet.address, docType);
            if (!raw.contentHash)
                return null;
            return this.toEntry(raw);
        }
        catch {
            return null;
        }
    }
    async documentAt(docType, version) {
        await this.init();
        try {
            const raw = await this.contract.getDocumentAt(this.wallet.address, docType, version);
            if (!raw.contentHash)
                return null;
            return this.toEntry(raw);
        }
        catch {
            return null;
        }
    }
    async documentCount(docType) {
        await this.init();
        const count = await this.contract.getDocumentCount(this.wallet.address, docType);
        return Number(count);
    }
    async verifyDocument(docType, version, expectedHash) {
        const doc = await this.documentAt(docType, version);
        if (!doc)
            return false;
        return doc.contentHash === expectedHash;
    }
    async grantAccess(reader, docType) {
        await this.init();
        const tx = await this.contract.grantAccess(reader, docType);
        const receipt = await tx.wait();
        return receipt.hash;
    }
    async revokeAccess(reader, docType) {
        await this.init();
        const tx = await this.contract.revokeAccess(reader, docType);
        const receipt = await tx.wait();
        return receipt.hash;
    }
    /** Get explorer URL for a transaction */
    txUrl(txHash) {
        if (!this.config.explorerUrl)
            return null;
        return `${this.config.explorerUrl}/tx/${txHash}`;
    }
}
exports.EVMChainProvider = EVMChainProvider;
