import { createHash, randomBytes } from 'crypto';
import type { ChainProvider, DocumentEntry } from './chain';

export class MockChainProvider implements ChainProvider {
  private documents = new Map<number, DocumentEntry[]>();
  private accessGrants = new Map<string, Set<number>>();
  private registered = false;

  private txHash(): string {
    return '0x' + randomBytes(32).toString('hex');
  }

  async registerSoul(): Promise<string> {
    this.registered = true;
    return this.txHash();
  }

  async writeDocument(docType: number, contentHash: string, encryptedHash: string, cid: string, signature: string): Promise<string> {
    const docs = this.documents.get(docType) ?? [];
    const entry: DocumentEntry = {
      docType,
      contentHash,
      encryptedHash,
      cid,
      signature,
      version: docs.length,
      timestamp: Date.now(),
    };
    docs.push(entry);
    this.documents.set(docType, docs);
    return this.txHash();
  }

  async latestDocument(docType: number): Promise<DocumentEntry | null> {
    const docs = this.documents.get(docType);
    if (!docs || docs.length === 0) return null;
    return docs[docs.length - 1];
  }

  async documentAt(docType: number, version: number): Promise<DocumentEntry | null> {
    const docs = this.documents.get(docType);
    if (!docs || version < 0 || version >= docs.length) return null;
    return docs[version];
  }

  async documentCount(docType: number): Promise<number> {
    return this.documents.get(docType)?.length ?? 0;
  }

  async verifyDocument(docType: number, version: number, expectedHash: string): Promise<boolean> {
    const doc = await this.documentAt(docType, version);
    if (!doc) return false;
    return doc.contentHash === expectedHash;
  }

  async grantAccess(reader: string, docType: number): Promise<string> {
    const grants = this.accessGrants.get(reader) ?? new Set();
    grants.add(docType);
    this.accessGrants.set(reader, grants);
    return this.txHash();
  }

  async revokeAccess(reader: string, docType: number): Promise<string> {
    const grants = this.accessGrants.get(reader);
    if (grants) grants.delete(docType);
    return this.txHash();
  }

  /** Test helper */
  clear(): void {
    this.documents.clear();
    this.accessGrants.clear();
    this.registered = false;
  }
}
