export interface StorageAdapter {
    upload(data: Buffer, filename: string): Promise<string>;
    download(cid: string): Promise<Buffer>;
    exists(cid: string): Promise<boolean>;
    pin?(cid: string): Promise<void>;
    unpin?(cid: string): Promise<void>;
}
//# sourceMappingURL=types.d.ts.map