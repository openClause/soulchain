import type { StorageAdapter } from './types';
export declare class MockStorageAdapter implements StorageAdapter {
    private store;
    upload(data: Buffer, _filename: string): Promise<string>;
    download(cid: string): Promise<Buffer>;
    exists(cid: string): Promise<boolean>;
    pin(cid: string): Promise<void>;
    unpin(cid: string): Promise<void>;
    /** Test helper: clear all stored data */
    clear(): void;
    /** Test helper: number of stored items */
    get size(): number;
}
