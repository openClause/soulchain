import { createHash, randomBytes } from 'crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import type { ChainProvider, DocumentEntry } from './chain';

export class MockChainProvider implements ChainProvider {
  private documents = new Map<number, DocumentEntry[]>();
  private accessGrants = new Map<string, Set<number>>();
  private registered = false;
  private persistPath: string | null = null;
  private childrenMap = new Map<string, string[]>();
  private parentMap = new Map<string, string>();
  private accessKeysMap = new Map<string, Buffer>(); // "owner:reader:docType" => key
  // Multi-agent support for testing
  private multiAgentDocs = new Map<string, Map<number, DocumentEntry[]>>(); // agent => docType => entries
  private multiAgentGrants = new Map<string, Map<string, Set<number>>>(); // agent => reader => docTypes
  private _currentAgent: string = 'default';

  constructor(persistDir?: string) {
    if (persistDir) {
      this.persistPath = join(persistDir, '.soulchain', 'mock-chain.json');
      this.loadFromDisk();
    }
  }

  private loadFromDisk(): void {
    if (!this.persistPath || !existsSync(this.persistPath)) return;
    try {
      const data = JSON.parse(readFileSync(this.persistPath, 'utf-8'));
      if (data.documents) {
        for (const [key, docs] of Object.entries(data.documents)) {
          this.documents.set(Number(key), docs as DocumentEntry[]);
        }
      }
      this.registered = data.registered ?? false;
    } catch {}
  }

  private saveToDisk(): void {
    if (!this.persistPath) return;
    try {
      const dir = dirname(this.persistPath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const obj: any = { registered: this.registered, documents: {} };
      for (const [key, docs] of this.documents.entries()) {
        obj.documents[String(key)] = docs;
      }
      writeFileSync(this.persistPath, JSON.stringify(obj, null, 2));
    } catch {}
  }

  private txHash(): string {
    return '0x' + randomBytes(32).toString('hex');
  }

  async registerSoul(): Promise<string> {
    this.registered = true;
    this.saveToDisk();
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
    this.saveToDisk();
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

  async hasAccess(agent: string, reader: string, docType: number): Promise<boolean> {
    if (agent === reader) return true;
    // Parent can always access child
    if (this.parentMap.get(agent) === reader) return true;
    const grants = this.accessGrants.get(reader);
    return grants?.has(docType) ?? false;
  }

  async registerChild(child: string): Promise<string> {
    const parent = this._currentAgent;
    this.parentMap.set(child, parent);
    const kids = this.childrenMap.get(parent) ?? [];
    kids.push(child);
    this.childrenMap.set(parent, kids);
    return this.txHash();
  }

  async getChildren(agent: string): Promise<string[]> {
    return this.childrenMap.get(agent) ?? [];
  }

  async getParent(agent: string): Promise<string> {
    return this.parentMap.get(agent) ?? '0x0000000000000000000000000000000000000000';
  }

  async storeAccessKey(reader: string, docType: number, encryptedKey: Buffer): Promise<string> {
    const key = `${this._currentAgent}:${reader}:${docType}`;
    this.accessKeysMap.set(key, encryptedKey);
    return this.txHash();
  }

  async getAccessKey(owner: string, reader: string, docType: number): Promise<Buffer | null> {
    const key = `${owner}:${reader}:${docType}`;
    return this.accessKeysMap.get(key) ?? null;
  }

  async removeAccessKey(reader: string, docType: number): Promise<string> {
    const key = `${this._currentAgent}:${reader}:${docType}`;
    this.accessKeysMap.delete(key);
    return this.txHash();
  }

  async latestDocumentOf(agent: string, docType: number): Promise<DocumentEntry | null> {
    // For mock, same as latestDocument (no multi-agent isolation in simple mock)
    return this.latestDocument(docType);
  }

  /** Set current agent identity for mock testing */
  setAgent(agent: string): void {
    this._currentAgent = agent;
  }

  /** Test helper */
  clear(): void {
    this.documents.clear();
    this.accessGrants.clear();
    this.registered = false;
    this.childrenMap.clear();
    this.parentMap.clear();
    this.accessKeysMap.clear();
  }
}
