import type { StorageAdapter } from '../storage/types';
import type { ChainProvider } from './chain';
import type { SyncQueue, SyncItem } from './queue';
export interface SyncWorkerConfig {
    intervalMs?: number;
    maxRetries?: number;
    onSync?: (item: SyncItem, result: 'success' | 'failed', error?: string) => void;
}
export declare class SyncWorker {
    private queue;
    private storage;
    private chain;
    private intervalMs;
    private maxRetries;
    private onSync?;
    private timer;
    private processing;
    constructor(queue: SyncQueue, storage: StorageAdapter, chain: ChainProvider, config?: SyncWorkerConfig);
    start(): void;
    stop(): void;
    get isRunning(): boolean;
    private tick;
    private processItem;
}
//# sourceMappingURL=worker.d.ts.map