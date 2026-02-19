import type { ChainProvider, DocumentEntry } from './chain';
export declare class MockChainProvider implements ChainProvider {
    private documents;
    private accessGrants;
    private registered;
    private txHash;
    registerSoul(): Promise<string>;
    writeDocument(docType: number, contentHash: string, encryptedHash: string, cid: string, signature: string): Promise<string>;
    latestDocument(docType: number): Promise<DocumentEntry | null>;
    documentAt(docType: number, version: number): Promise<DocumentEntry | null>;
    documentCount(docType: number): Promise<number>;
    verifyDocument(docType: number, version: number, expectedHash: string): Promise<boolean>;
    grantAccess(reader: string, docType: number): Promise<string>;
    revokeAccess(reader: string, docType: number): Promise<string>;
    /** Test helper */
    clear(): void;
}
