export interface SyncItem {
    id: string;
    docType: number;
    path: string;
    contentHash: string;
    encryptedData: Buffer;
    status: 'pending' | 'processing' | 'complete' | 'failed';
    retries: number;
    error?: string;
    createdAt: string;
    updatedAt: string;
}
export declare class SyncQueue {
    private db;
    constructor(dbPath: string);
    enqueue(item: Pick<SyncItem, 'docType' | 'path' | 'contentHash' | 'encryptedData'>): string;
    dequeue(limit: number): SyncItem[];
    markComplete(id: string): void;
    markFailed(id: string, error: string): void;
    requeue(id: string): void;
    compact(): void;
    pending(): number;
    close(): void;
    private rowToItem;
}
//# sourceMappingURL=queue.d.ts.map