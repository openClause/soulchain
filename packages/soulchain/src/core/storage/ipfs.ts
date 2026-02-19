import type { StorageAdapter } from './types';

export interface PinataConfig {
  apiKey: string;
  apiSecret: string;
  gateway?: string;
}

export class IpfsStorageAdapter implements StorageAdapter {
  private apiKey: string;
  private apiSecret: string;
  private gateway: string;

  constructor(config: PinataConfig) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.gateway = config.gateway ?? 'https://gateway.pinata.cloud/ipfs/';
  }

  async upload(data: Buffer, filename: string): Promise<string> {
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

    if (!res.ok) throw new Error(`Pinata upload failed: ${res.status} ${await res.text()}`);
    const json = (await res.json()) as { IpfsHash: string };
    return json.IpfsHash;
  }

  async download(cid: string): Promise<Buffer> {
    const res = await fetch(`${this.gateway}${cid}`);
    if (!res.ok) throw new Error(`IPFS download failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  async exists(cid: string): Promise<boolean> {
    try {
      const res = await fetch(`https://api.pinata.cloud/pinning/pins?hashContains=${cid}&status=pinned`, {
        headers: {
          'pinata_api_key': this.apiKey,
          'pinata_secret_api_key': this.apiSecret,
        },
      });
      if (!res.ok) return false;
      const json = (await res.json()) as { count: number };
      return json.count > 0;
    } catch {
      return false;
    }
  }

  async pin(cid: string): Promise<void> {
    const res = await fetch('https://api.pinata.cloud/pinning/pinByHash', {
      method: 'POST',
      headers: {
        'pinata_api_key': this.apiKey,
        'pinata_secret_api_key': this.apiSecret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ hashToPin: cid }),
    });
    if (!res.ok) throw new Error(`Pinata pin failed: ${res.status}`);
  }

  async unpin(cid: string): Promise<void> {
    const res = await fetch(`https://api.pinata.cloud/pinning/unpin/${cid}`, {
      method: 'DELETE',
      headers: {
        'pinata_api_key': this.apiKey,
        'pinata_secret_api_key': this.apiSecret,
      },
    });
    if (!res.ok) throw new Error(`Pinata unpin failed: ${res.status}`);
  }
}
