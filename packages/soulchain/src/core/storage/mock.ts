import { createHash } from 'crypto';
import type { StorageAdapter } from './types';

export class MockStorageAdapter implements StorageAdapter {
  private store = new Map<string, Buffer>();

  async upload(data: Buffer, _filename: string): Promise<string> {
    const cid = createHash('sha256').update(data).digest('hex');
    this.store.set(cid, Buffer.from(data));
    return cid;
  }

  async download(cid: string): Promise<Buffer> {
    const data = this.store.get(cid);
    if (!data) throw new Error(`Not found: ${cid}`);
    return Buffer.from(data);
  }

  async exists(cid: string): Promise<boolean> {
    return this.store.has(cid);
  }

  async pin(cid: string): Promise<void> {
    if (!this.store.has(cid)) throw new Error(`Not found: ${cid}`);
  }

  async unpin(cid: string): Promise<void> {
    if (!this.store.has(cid)) throw new Error(`Not found: ${cid}`);
  }

  /** Test helper: clear all stored data */
  clear(): void {
    this.store.clear();
  }

  /** Test helper: number of stored items */
  get size(): number {
    return this.store.size;
  }
}
