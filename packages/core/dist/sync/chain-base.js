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
exports.BASE_NETWORKS = exports.BaseChainProvider = void 0;
const NETWORKS = {
    'base': { rpcUrl: 'https://mainnet.base.org' },
    'base-sepolia': { rpcUrl: 'https://sepolia.base.org' },
};
exports.BASE_NETWORKS = NETWORKS;
/**
 * Base L2 chain provider using ethers.js v6.
 * Requires ethers as a peer dependency.
 */
class BaseChainProvider {
    config;
    provider;
    wallet;
    contract;
    constructor(config) {
        this.config = config;
    }
    async init() {
        if (this.contract)
            return;
        // Dynamic import to keep ethers optional
        const { ethers } = await Promise.resolve(`${'ethers'}`).then(s => __importStar(require(s)));
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
}
exports.BaseChainProvider = BaseChainProvider;
//# sourceMappingURL=chain-base.js.map