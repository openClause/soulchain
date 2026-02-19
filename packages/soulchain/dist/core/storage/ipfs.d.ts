import type { StorageAdapter } from './types';
export interface PinataConfig {
    apiKey: string;
    apiSecret: string;
    gateway?: string;
}
export declare class IpfsStorageAdapter implements StorageAdapter {
    private apiKey;
    private apiSecret;
    private gateway;
    constructor(config: PinataConfig);
    upload(data: Buffer, filename: string): Promise<string>;
    download(cid: string): Promise<Buffer>;
    exists(cid: string): Promise<boolean>;
    pin(cid: string): Promise<void>;
    unpin(cid: string): Promise<void>;
}
