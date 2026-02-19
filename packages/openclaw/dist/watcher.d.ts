import type { SoulchainConfig, SyncEngine } from '@openclaused/core';
export declare class FileWatcher {
    private config;
    private engine;
    private watchers;
    private debounceTimers;
    private debounceMs;
    constructor(config: SoulchainConfig, engine: SyncEngine);
    start(): void;
    stop(): void;
    private handleChange;
}
//# sourceMappingURL=watcher.d.ts.map