import type { StorageAdapter } from '../storage/types';
import type { ChainProvider } from './chain';
import type { SyncQueue, SyncItem } from './queue';

export interface SyncWorkerConfig {
  intervalMs?: number;
  maxRetries?: number;
  onSync?: (item: SyncItem, result: 'success' | 'failed', error?: string) => void;
}

export class SyncWorker {
  private queue: SyncQueue;
  private storage: StorageAdapter;
  private chain: ChainProvider;
  private intervalMs: number;
  private maxRetries: number;
  private onSync?: SyncWorkerConfig['onSync'];
  private timer: ReturnType<typeof setInterval> | null = null;
  private processing = false;

  constructor(queue: SyncQueue, storage: StorageAdapter, chain: ChainProvider, config: SyncWorkerConfig = {}) {
    this.queue = queue;
    this.storage = storage;
    this.chain = chain;
    this.intervalMs = config.intervalMs ?? 5000;
    this.maxRetries = config.maxRetries ?? 5;
    this.onSync = config.onSync;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), this.intervalMs);
    // Run immediately
    this.tick();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  get isRunning(): boolean {
    return this.timer !== null;
  }

  private async tick(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    try {
      const items = this.queue.dequeue(10);
      for (const item of items) {
        await this.processItem(item);
      }
    } catch {
      // Non-blocking: swallow errors at tick level
    } finally {
      this.processing = false;
    }
  }

  private async processItem(item: SyncItem): Promise<void> {
    try {
      // Upload encrypted data to storage
      const cid = await this.storage.upload(item.encryptedData, `${item.path}.enc`);

      // Write hash to chain
      await this.chain.writeDocument(
        item.docType,
        item.contentHash,
        '', // encryptedHash — computed upstream
        cid,
        '', // signature — computed upstream
      );

      this.queue.markComplete(item.id);
      this.onSync?.(item, 'success');
    } catch (err: any) {
      const errorMsg = err?.message ?? String(err);
      this.queue.markFailed(item.id, errorMsg);

      if (item.retries < this.maxRetries) {
        // Exponential backoff: re-enqueue after delay
        // For simplicity, just requeue — the interval handles backoff naturally
        this.queue.requeue(item.id);
      }

      this.onSync?.(item, 'failed', errorMsg);
    }
  }
}
