import type { SoulchainConfig } from '../types/documents';
import type { StorageAdapter } from '../storage/types';
import { type EncryptedData } from '../crypto/encryption';
import type { ChainProvider } from './chain';
export interface CryptoProvider {
    encrypt(data: Buffer): EncryptedData;
    decrypt(enc: EncryptedData): Buffer;
    sign(data: Buffer): string;
}
export interface IntegrityReport {
    verified: number;
    tampered: string[];
    missing: string[];
    untracked: string[];
}
export interface MigrationReport {
    filesFound: number;
    filesUploaded: number;
    filesFailed: string[];
    totalBytes: number;
}
export interface SyncStatus {
    pendingFiles: number;
    lastSync: string | null;
    isRunning: boolean;
}
export declare class SyncEngine {
    private config;
    private crypto;
    private storage;
    private chain;
    private lastSync;
    private pendingCount;
    private running;
    constructor(config: SoulchainConfig, crypto: CryptoProvider, storage: StorageAdapter, chain: ChainProvider);
    onFileWrite(path: string, content: Buffer): Promise<void>;
    verifyIntegrity(): Promise<IntegrityReport>;
    restoreFile(path: string, version?: number): Promise<Buffer>;
    migrateExisting(workspaceDir: string, trackedPaths: string[]): Promise<MigrationReport>;
    status(): SyncStatus;
}
//# sourceMappingURL=engine.d.ts.map