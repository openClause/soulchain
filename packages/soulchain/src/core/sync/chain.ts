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
  hasAccess(agent: string, reader: string, docType: number): Promise<boolean>;
  registerChild(child: string): Promise<string>;
  getChildren(agent: string): Promise<string[]>;
  getParent(agent: string): Promise<string>;
  storeAccessKey(reader: string, docType: number, encryptedKey: Buffer): Promise<string>;
  getAccessKey(owner: string, reader: string, docType: number): Promise<Buffer | null>;
  removeAccessKey(reader: string, docType: number): Promise<string>;
  // Read another agent's document (requires access)
  latestDocumentOf(agent: string, docType: number): Promise<DocumentEntry | null>;
}
