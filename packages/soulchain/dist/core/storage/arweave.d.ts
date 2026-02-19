import type { StorageAdapter } from './types';
export interface ArweaveConfig {
    gateway?: string;
    irysNode?: string;
    privateKey?: string;
}
export declare class ArweaveStorageAdapter implements StorageAdapter {
    private gateway;
    private irysNode;
    private privateKey?;
    constructor(config?: ArweaveConfig);
    upload(data: Buffer, filename: string): Promise<string>;
    download(cid: string): Promise<Buffer>;
    exists(cid: string): Promise<boolean>;
    pin(_cid: string): Promise<void>;
    unpin(_cid: string): Promise<void>;
}
