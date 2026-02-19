"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IpfsStorageAdapter = void 0;
class IpfsStorageAdapter {
    apiKey;
    apiSecret;
    gateway;
    constructor(config) {
        this.apiKey = config.apiKey;
        this.apiSecret = config.apiSecret;
        this.gateway = config.gateway ?? 'https://gateway.pinata.cloud/ipfs/';
    }
    async upload(data, filename) {
        const boundary = '----SoulchainBoundary' + Date.now();
        const body = Buffer.concat([
            Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`),
            data,
            Buffer.from(`\r\n--${boundary}--\r\n`),
        ]);
        const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
            method: 'POST',
            headers: {
                'pinata_api_key': this.apiKey,
                'pinata_secret_api_key': this.apiSecret,
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
            },
            body,
        });
        if (!res.ok)
            throw new Error(`Pinata upload failed: ${res.status} ${await res.text()}`);
        const json = (await res.json());
        return json.IpfsHash;
    }
    async download(cid) {
        const res = await fetch(`${this.gateway}${cid}`);
        if (!res.ok)
            throw new Error(`IPFS download failed: ${res.status}`);
        return Buffer.from(await res.arrayBuffer());
    }
    async exists(cid) {
        try {
            const res = await fetch(`https://api.pinata.cloud/pinning/pins?hashContains=${cid}&status=pinned`, {
                headers: {
                    'pinata_api_key': this.apiKey,
                    'pinata_secret_api_key': this.apiSecret,
                },
            });
            if (!res.ok)
                return false;
            const json = (await res.json());
            return json.count > 0;
        }
        catch {
            return false;
        }
    }
    async pin(cid) {
        const res = await fetch('https://api.pinata.cloud/pinning/pinByHash', {
            method: 'POST',
            headers: {
                'pinata_api_key': this.apiKey,
                'pinata_secret_api_key': this.apiSecret,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ hashToPin: cid }),
        });
        if (!res.ok)
            throw new Error(`Pinata pin failed: ${res.status}`);
    }
    async unpin(cid) {
        const res = await fetch(`https://api.pinata.cloud/pinning/unpin/${cid}`, {
            method: 'DELETE',
            headers: {
                'pinata_api_key': this.apiKey,
                'pinata_secret_api_key': this.apiSecret,
            },
        });
        if (!res.ok)
            throw new Error(`Pinata unpin failed: ${res.status}`);
    }
}
exports.IpfsStorageAdapter = IpfsStorageAdapter;
//# sourceMappingURL=ipfs.js.map