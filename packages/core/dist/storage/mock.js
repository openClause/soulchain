"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockStorageAdapter = void 0;
const crypto_1 = require("crypto");
class MockStorageAdapter {
    store = new Map();
    async upload(data, _filename) {
        const cid = (0, crypto_1.createHash)('sha256').update(data).digest('hex');
        this.store.set(cid, Buffer.from(data));
        return cid;
    }
    async download(cid) {
        const data = this.store.get(cid);
        if (!data)
            throw new Error(`Not found: ${cid}`);
        return Buffer.from(data);
    }
    async exists(cid) {
        return this.store.has(cid);
    }
    async pin(cid) {
        if (!this.store.has(cid))
            throw new Error(`Not found: ${cid}`);
    }
    async unpin(cid) {
        if (!this.store.has(cid))
            throw new Error(`Not found: ${cid}`);
    }
    /** Test helper: clear all stored data */
    clear() {
        this.store.clear();
    }
    /** Test helper: number of stored items */
    get size() {
        return this.store.size;
    }
}
exports.MockStorageAdapter = MockStorageAdapter;
//# sourceMappingURL=mock.js.map