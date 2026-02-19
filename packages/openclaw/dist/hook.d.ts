import type { SyncEngine } from '@soulchain/core';
export declare class SoulchainHook {
    private engine;
    private trackedPaths;
    private workspaceDir;
    private installed;
    private originalWriteFileSync;
    private originalWriteFile;
    private originalPromisesWriteFile;
    constructor(engine: SyncEngine, workspaceDir: string, trackedPaths: string[]);
    install(): void;
    uninstall(): void;
    private maybeIntercept;
    private onWrite;
}
//# sourceMappingURL=hook.d.ts.map