"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockChainProvider = void 0;
const crypto_1 = require("crypto");
class MockChainProvider {
    constructor() {
        this.documents = new Map();
        this.accessGrants = new Map();
        this.registered = false;
    }
    txHash() {
        return '0x' + (0, crypto_1.randomBytes)(32).toString('hex');
    }
    async registerSoul() {
        this.registered = true;
        return this.txHash();
    }
    async writeDocument(docType, contentHash, encryptedHash, cid, signature) {
        const docs = this.documents.get(docType) ?? [];
        const entry = {
            docType,
            contentHash,
            encryptedHash,
            cid,
            signature,
            version: docs.length,
            timestamp: Date.now(),
        };
        docs.push(entry);
        this.documents.set(docType, docs);
        return this.txHash();
    }
    async latestDocument(docType) {
        const docs = this.documents.get(docType);
        if (!docs || docs.length === 0)
            return null;
        return docs[docs.length - 1];
    }
    async documentAt(docType, version) {
        const docs = this.documents.get(docType);
        if (!docs || version < 0 || version >= docs.length)
            return null;
        return docs[version];
    }
    async documentCount(docType) {
        return this.documents.get(docType)?.length ?? 0;
    }
    async verifyDocument(docType, version, expectedHash) {
        const doc = await this.documentAt(docType, version);
        if (!doc)
            return false;
        return doc.contentHash === expectedHash;
    }
    async grantAccess(reader, docType) {
        const grants = this.accessGrants.get(reader) ?? new Set();
        grants.add(docType);
        this.accessGrants.set(reader, grants);
        return this.txHash();
    }
    async revokeAccess(reader, docType) {
        const grants = this.accessGrants.get(reader);
        if (grants)
            grants.delete(docType);
        return this.txHash();
    }
    /** Test helper */
    clear() {
        this.documents.clear();
        this.accessGrants.clear();
        this.registered = false;
    }
}
exports.MockChainProvider = MockChainProvider;
