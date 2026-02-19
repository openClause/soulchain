"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncWorker = void 0;
class SyncWorker {
    queue;
    storage;
    chain;
    intervalMs;
    maxRetries;
    onSync;
    timer = null;
    processing = false;
    constructor(queue, storage, chain, config = {}) {
        this.queue = queue;
        this.storage = storage;
        this.chain = chain;
        this.intervalMs = config.intervalMs ?? 5000;
        this.maxRetries = config.maxRetries ?? 5;
        this.onSync = config.onSync;
    }
    start() {
        if (this.timer)
            return;
        this.timer = setInterval(() => this.tick(), this.intervalMs);
        // Run immediately
        this.tick();
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    get isRunning() {
        return this.timer !== null;
    }
    async tick() {
        if (this.processing)
            return;
        this.processing = true;
        try {
            const items = this.queue.dequeue(10);
            for (const item of items) {
                await this.processItem(item);
            }
        }
        catch {
            // Non-blocking: swallow errors at tick level
        }
        finally {
            this.processing = false;
        }
    }
    async processItem(item) {
        try {
            // Upload encrypted data to storage
            const cid = await this.storage.upload(item.encryptedData, `${item.path}.enc`);
            // Write hash to chain
            await this.chain.writeDocument(item.docType, item.contentHash, '', // encryptedHash — computed upstream
            cid, '');
            this.queue.markComplete(item.id);
            this.onSync?.(item, 'success');
        }
        catch (err) {
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
exports.SyncWorker = SyncWorker;
//# sourceMappingURL=worker.js.map