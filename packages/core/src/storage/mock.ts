import { createHash } from 'crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import type { StorageAdapter } from './types';

export class MockStorageAdapter implements StorageAdapter {
  private store = new Map<string, Buffer>();
  private blobDir: string | null = null;

  constructor(persistDir?: string) {
    if (persistDir) {
      this.blobDir = join(persistDir, '.soulchain', 'blobs');
      if (!existsSync(this.blobDir)) mkdirSync(this.blobDir, { recursive: true });
    }
  }

  async upload(data: Buffer, _filename: string): Promise<string> {
    const cid = createHash('sha256').update(data).digest('hex');
    this.store.set(cid, Buffer.from(data));
    if (this.blobDir) {
      writeFileSync(join(this.blobDir, cid), data);
    }
    return cid;
  }

  async download(cid: string): Promise<Buffer> {
    // Check in-memory first
    const mem = this.store.get(cid);
    if (mem) return Buffer.from(mem);
    // Check disk
    if (this.blobDir) {
      const filePath = join(this.blobDir, cid);
      if (existsSync(filePath)) {
        const data = readFileSync(filePath);
        this.store.set(cid, data); // cache in memory
        return Buffer.from(data);
      }
    }
    throw new Error(`Not found: ${cid}`);
  }

  async exists(cid: string): Promise<boolean> {
    if (this.store.has(cid)) return true;
    if (this.blobDir) return existsSync(join(this.blobDir, cid));
    return false;
  }

  async pin(cid: string): Promise<void> {
    if (!(await this.exists(cid))) throw new Error(`Not found: ${cid}`);
  }

  async unpin(cid: string): Promise<void> {
    if (!(await this.exists(cid))) throw new Error(`Not found: ${cid}`);
  }

  /** Test helper: clear all stored data */
  clear(): void {
    this.store.clear();
    if (this.blobDir && existsSync(this.blobDir)) {
      for (const f of readdirSync(this.blobDir)) {
        try { unlinkSync(join(this.blobDir, f)); } catch {}
      }
    }
  }

  /** Test helper: number of stored items */
  get size(): number {
    return this.store.size;
  }
}
