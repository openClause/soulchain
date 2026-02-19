import type { ChainProvider, DocumentEntry } from './chain';
export interface BaseChainConfig {
    rpcUrl: string;
    contractAddress: string;
    privateKey: string;
}
declare const NETWORKS: Record<string, {
    rpcUrl: string;
}>;
/**
 * Base L2 chain provider using ethers.js v6.
 * Requires ethers as a peer dependency.
 */
export declare class BaseChainProvider implements ChainProvider {
    private config;
    private provider;
    private wallet;
    private contract;
    constructor(config: BaseChainConfig);
    private init;
    private toEntry;
    registerSoul(): Promise<string>;
    writeDocument(docType: number, contentHash: string, encryptedHash: string, cid: string, signature: string): Promise<string>;
    latestDocument(docType: number): Promise<DocumentEntry | null>;
    documentAt(docType: number, version: number): Promise<DocumentEntry | null>;
    documentCount(docType: number): Promise<number>;
    verifyDocument(docType: number, version: number, expectedHash: string): Promise<boolean>;
    grantAccess(reader: string, docType: number): Promise<string>;
    revokeAccess(reader: string, docType: number): Promise<string>;
}
export { NETWORKS as BASE_NETWORKS };
