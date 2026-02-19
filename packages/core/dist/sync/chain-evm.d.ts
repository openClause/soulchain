import type { ChainProvider, DocumentEntry } from './chain';
export interface EVMChainConfig {
    name: string;
    rpcUrl: string;
    chainId: number;
    contractAddress?: string;
    explorerUrl?: string;
    privateKey?: string;
}
export declare const CHAINS: Record<string, EVMChainConfig>;
/**
 * Generic EVM chain provider — works with Base, Arbitrum, Optimism, Polygon, Ethereum, localhost, or any custom EVM.
 * Requires ethers v6 as a peer dependency.
 */
export declare class EVMChainProvider implements ChainProvider {
    private config;
    private provider;
    private wallet;
    private contract;
    constructor(chainNameOrConfig: string | EVMChainConfig, privateKey?: string);
    get chainConfig(): EVMChainConfig;
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
    /** Get explorer URL for a transaction */
    txUrl(txHash: string): string | null;
}
//# sourceMappingURL=chain-evm.d.ts.map