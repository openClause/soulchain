export interface DocumentEntry {
    docType: number;
    contentHash: string;
    encryptedHash: string;
    cid: string;
    signature: string;
    version: number;
    timestamp: number;
}
export interface ChainProvider {
    registerSoul(): Promise<string>;
    writeDocument(docType: number, contentHash: string, encryptedHash: string, cid: string, signature: string): Promise<string>;
    latestDocument(docType: number): Promise<DocumentEntry | null>;
    documentAt(docType: number, version: number): Promise<DocumentEntry | null>;
    documentCount(docType: number): Promise<number>;
    verifyDocument(docType: number, version: number, expectedHash: string): Promise<boolean>;
    grantAccess(reader: string, docType: number): Promise<string>;
    revokeAccess(reader: string, docType: number): Promise<string>;
}
//# sourceMappingURL=chain.d.ts.map