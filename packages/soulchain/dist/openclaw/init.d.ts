import type { ChainConfig, MigrationReport } from '../core/index';
export interface InitOptions {
    chain: string | ChainConfig;
    storage: 'ipfs' | 'arweave' | 'mock';
    passphrase?: string;
    autoMigrate?: boolean;
}
export interface InitResult {
    publicKey: string;
    address: string;
    keystorePath: string;
    configPath: string;
    registrationTx?: string;
    migration?: MigrationReport;
}
export declare function initSoulchain(workspaceDir: string, options: InitOptions): Promise<InitResult>;
