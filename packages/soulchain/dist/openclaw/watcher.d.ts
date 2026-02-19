import type { SoulchainConfig, SyncEngine } from '../core/index';
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
