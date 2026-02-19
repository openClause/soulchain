import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { createHash } from 'crypto';
import type { SoulchainConfig } from '../types/documents';
import { SoulDocumentType } from '../types/documents';
import type { StorageAdapter } from '../storage/types';
import { encrypt, decrypt, type EncryptedData } from '../crypto/encryption';
import { sha256 } from '../utils/hash';
import type { ChainProvider, DocumentEntry } from './chain';

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

// Map document types to numeric IDs for chain
const DOC_TYPE_MAP: Record<string, number> = Object.fromEntries(
  Object.values(SoulDocumentType).map((v, i) => [v, i])
);

function pathToDocType(filePath: string): number {
  const lower = filePath.toLowerCase();
  for (const [name, id] of Object.entries(DOC_TYPE_MAP)) {
    if (lower.includes(name)) return id;
  }
  return 0; // default to SOUL
}

export class SyncEngine {
  private config: SoulchainConfig;
  private crypto: CryptoProvider;
  private storage: StorageAdapter;
  private chain: ChainProvider;
  private lastSync: string | null = null;
  private pendingCount = 0;
  private running = false;
  private _workspaceDir: string | null = null;

  constructor(config: SoulchainConfig, crypto: CryptoProvider, storage: StorageAdapter, chain: ChainProvider) {
    this.config = config;
    this.crypto = crypto;
    this.storage = storage;
    this.chain = chain;
  }

  setWorkspaceDir(dir: string): void {
    this._workspaceDir = dir;
  }

  async onFileWrite(path: string, content: Buffer): Promise<void> {
    this.pendingCount++;
    try {
      const contentHashVal = sha256(content);
      const encrypted = this.crypto.encrypt(content);
      const encryptedBuf = Buffer.concat([encrypted.iv, encrypted.tag, encrypted.ciphertext]);
      const encryptedHash = sha256(encryptedBuf);
      const signature = this.crypto.sign(Buffer.from(contentHashVal));

      // Upload to storage
      const cid = await this.storage.upload(encryptedBuf, `${path}.enc`);

      // Write to chain
      const docType = pathToDocType(path);
      await this.chain.writeDocument(docType, contentHashVal, encryptedHash, cid, signature);

      this.lastSync = new Date().toISOString();
    } finally {
      this.pendingCount--;
    }
  }

  async verifyIntegrity(): Promise<IntegrityReport> {
    const report: IntegrityReport = { verified: 0, tampered: [], missing: [], untracked: [] };

    for (const trackedPath of this.config.trackedPaths) {
      const docType = pathToDocType(trackedPath);
      const fullPath = this._workspaceDir ? join(this._workspaceDir, trackedPath) : trackedPath;
      const chainDoc = await this.chain.latestDocument(docType);

      if (!chainDoc) {
        if (existsSync(fullPath)) {
          report.untracked.push(trackedPath);
        }
        continue;
      }

      if (!existsSync(fullPath)) {
        report.missing.push(trackedPath);
        continue;
      }

      const localHash = sha256(readFileSync(fullPath));
      if (localHash === chainDoc.contentHash) {
        report.verified++;
      } else {
        report.tampered.push(trackedPath);
      }
    }

    return report;
  }

  async restoreFile(path: string, version?: number): Promise<Buffer> {
    const docType = pathToDocType(path);
    const doc = version !== undefined
      ? await this.chain.documentAt(docType, version)
      : await this.chain.latestDocument(docType);

    if (!doc) throw new Error(`No chain record for ${path}${version !== undefined ? ` v${version}` : ''}`);

    const encryptedBuf = await this.storage.download(doc.cid);

    // Parse: iv(12) + tag(16) + ciphertext
    const iv = encryptedBuf.subarray(0, 12);
    const tag = encryptedBuf.subarray(12, 28);
    const ciphertext = encryptedBuf.subarray(28);

    return this.crypto.decrypt({ ciphertext, iv, tag });
  }

  async migrateExisting(workspaceDir: string, trackedPaths: string[]): Promise<MigrationReport> {
    const report: MigrationReport = { filesFound: 0, filesUploaded: 0, filesFailed: [], totalBytes: 0 };

    for (const p of trackedPaths) {
      const fullPath = join(workspaceDir, p);
      if (!existsSync(fullPath)) continue;

      report.filesFound++;
      try {
        const content = readFileSync(fullPath);
        report.totalBytes += content.length;
        await this.onFileWrite(p, content);
        report.filesUploaded++;
      } catch {
        report.filesFailed.push(p);
      }
    }

    return report;
  }

  async getLatestVersion(filePath: string): Promise<number> {
    const docType = pathToDocType(filePath);
    const doc = await this.chain.latestDocument(docType);
    return doc ? doc.version : -1;
  }

  async getLatestHash(filePath: string): Promise<string | null> {
    const docType = pathToDocType(filePath);
    const doc = await this.chain.latestDocument(docType);
    return doc ? doc.contentHash : null;
  }

  status(): SyncStatus {
    return {
      pendingFiles: this.pendingCount,
      lastSync: this.lastSync,
      isRunning: this.running,
    };
  }
}
