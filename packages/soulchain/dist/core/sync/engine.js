"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncEngine = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const documents_1 = require("../types/documents");
const hash_1 = require("../utils/hash");
// Map document types to numeric IDs for chain
const DOC_TYPE_MAP = Object.fromEntries(Object.values(documents_1.SoulDocumentType).map((v, i) => [v, i]));
function pathToDocType(filePath) {
    const lower = filePath.toLowerCase();
    for (const [name, id] of Object.entries(DOC_TYPE_MAP)) {
        if (lower.includes(name))
            return id;
    }
    return 0; // default to SOUL
}
class SyncEngine {
    constructor(config, crypto, storage, chain) {
        this.lastSync = null;
        this.pendingCount = 0;
        this.running = false;
        this.config = config;
        this.crypto = crypto;
        this.storage = storage;
        this.chain = chain;
    }
    async onFileWrite(path, content) {
        this.pendingCount++;
        try {
            const contentHashVal = (0, hash_1.sha256)(content);
            const encrypted = this.crypto.encrypt(content);
            const encryptedBuf = Buffer.concat([encrypted.iv, encrypted.tag, encrypted.ciphertext]);
            const encryptedHash = (0, hash_1.sha256)(encryptedBuf);
            const signature = this.crypto.sign(Buffer.from(contentHashVal));
            // Upload to storage
            const cid = await this.storage.upload(encryptedBuf, `${path}.enc`);
            // Write to chain
            const docType = pathToDocType(path);
            await this.chain.writeDocument(docType, contentHashVal, encryptedHash, cid, signature);
            this.lastSync = new Date().toISOString();
        }
        finally {
            this.pendingCount--;
        }
    }
    async verifyIntegrity() {
        const report = { verified: 0, tampered: [], missing: [], untracked: [] };
        for (const trackedPath of this.config.trackedPaths) {
            const docType = pathToDocType(trackedPath);
            const chainDoc = await this.chain.latestDocument(docType);
            if (!chainDoc) {
                if ((0, fs_1.existsSync)(trackedPath)) {
                    report.untracked.push(trackedPath);
                }
                continue;
            }
            if (!(0, fs_1.existsSync)(trackedPath)) {
                report.missing.push(trackedPath);
                continue;
            }
            const localHash = (0, hash_1.sha256)((0, fs_1.readFileSync)(trackedPath));
            if (localHash === chainDoc.contentHash) {
                report.verified++;
            }
            else {
                report.tampered.push(trackedPath);
            }
        }
        return report;
    }
    async restoreFile(path, version) {
        const docType = pathToDocType(path);
        const doc = version !== undefined
            ? await this.chain.documentAt(docType, version)
            : await this.chain.latestDocument(docType);
        if (!doc)
            throw new Error(`No chain record for ${path}${version !== undefined ? ` v${version}` : ''}`);
        const encryptedBuf = await this.storage.download(doc.cid);
        // Parse: iv(12) + tag(16) + ciphertext
        const iv = encryptedBuf.subarray(0, 12);
        const tag = encryptedBuf.subarray(12, 28);
        const ciphertext = encryptedBuf.subarray(28);
        return this.crypto.decrypt({ ciphertext, iv, tag });
    }
    async migrateExisting(workspaceDir, trackedPaths) {
        const report = { filesFound: 0, filesUploaded: 0, filesFailed: [], totalBytes: 0 };
        for (const p of trackedPaths) {
            const fullPath = (0, path_1.join)(workspaceDir, p);
            if (!(0, fs_1.existsSync)(fullPath))
                continue;
            report.filesFound++;
            try {
                const content = (0, fs_1.readFileSync)(fullPath);
                report.totalBytes += content.length;
                await this.onFileWrite(p, content);
                report.filesUploaded++;
            }
            catch {
                report.filesFailed.push(p);
            }
        }
        return report;
    }
    status() {
        return {
            pendingFiles: this.pendingCount,
            lastSync: this.lastSync,
            isRunning: this.running,
        };
    }
}
exports.SyncEngine = SyncEngine;
