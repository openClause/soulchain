"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArweaveStorageAdapter = void 0;
class ArweaveStorageAdapter {
    constructor(config = {}) {
        this.gateway = config.gateway ?? 'https://arweave.net';
        this.irysNode = config.irysNode ?? 'https://node2.irys.xyz';
        this.privateKey = config.privateKey;
    }
    async upload(data, filename) {
        // Upload via Irys (formerly Bundlr) for easier ETH-based payments
        const res = await fetch(`${this.irysNode}/tx/ethereum`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/octet-stream',
                ...(this.privateKey ? { 'x-private-key': this.privateKey } : {}),
                'x-tag-Content-Type': 'application/octet-stream',
                'x-tag-filename': filename,
            },
            body: data,
        });
        if (!res.ok)
            throw new Error(`Irys upload failed: ${res.status} ${await res.text()}`);
        const json = (await res.json());
        return json.id;
    }
    async download(cid) {
        const res = await fetch(`${this.gateway}/${cid}`);
        if (!res.ok)
            throw new Error(`Arweave download failed: ${res.status}`);
        return Buffer.from(await res.arrayBuffer());
    }
    async exists(cid) {
        try {
            const res = await fetch(`${this.gateway}/tx/${cid}/status`);
            if (!res.ok)
                return false;
            const json = (await res.json());
            return (json.number_of_confirmations ?? 0) > 0;
        }
        catch {
            return false;
        }
    }
    // Arweave data is permanent — pin/unpin are no-ops
    async pin(_cid) { }
    async unpin(_cid) { }
}
exports.ArweaveStorageAdapter = ArweaveStorageAdapter;
