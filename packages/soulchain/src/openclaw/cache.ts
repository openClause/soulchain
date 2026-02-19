import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

export interface CacheEntry {
  chainHash: string;
  localHash: string;
  chainVersion: number;
}

export interface CacheMetadata {
  [relativePath: string]: CacheEntry;
}

export class CacheManager {
  private metadataPath: string;
  private metadata: CacheMetadata = {};

  constructor(workspaceDir: string) {
    const soulchainDir = path.join(workspaceDir, '.soulchain');
    if (!fs.existsSync(soulchainDir)) {
      fs.mkdirSync(soulchainDir, { recursive: true });
    }
    this.metadataPath = path.join(soulchainDir, 'cache-hashes.json');
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.metadataPath)) {
        this.metadata = JSON.parse(fs.readFileSync(this.metadataPath, 'utf-8'));
      }
    } catch {
      this.metadata = {};
    }
  }

  private save(): void {
    fs.writeFileSync(this.metadataPath, JSON.stringify(this.metadata, null, 2));
  }

  update(relativePath: string, chainHash: string, chainVersion: number): void {
    this.metadata[relativePath] = {
      chainHash,
      localHash: chainHash, // local matches chain after write/restore
      chainVersion,
    };
    this.save();
  }

  get(relativePath: string): CacheEntry | undefined {
    return this.metadata[relativePath];
  }

  isFresh(relativePath: string, chainHash: string): boolean {
    const entry = this.metadata[relativePath];
    if (!entry) return false;
    return entry.chainHash === chainHash && entry.localHash === chainHash;
  }

  /** Update local hash based on actual file content */
  updateLocalHash(relativePath: string, localFilePath: string): void {
    const entry = this.metadata[relativePath];
    if (!entry) return;
    try {
      const content = fs.readFileSync(localFilePath);
      entry.localHash = createHash('sha256').update(content).digest('hex');
      this.save();
    } catch {
      // file doesn't exist
    }
  }

  all(): CacheMetadata {
    return { ...this.metadata };
  }
}
