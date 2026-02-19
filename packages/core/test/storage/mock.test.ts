import { describe, it, expect, beforeEach } from 'vitest';
import { MockStorageAdapter } from '../../src/storage/mock';

describe('MockStorageAdapter', () => {
  let storage: MockStorageAdapter;

  beforeEach(() => {
    storage = new MockStorageAdapter();
  });

  it('upload returns a sha256 CID', async () => {
    const cid = await storage.upload(Buffer.from('hello'), 'test.txt');
    expect(cid).toMatch(/^[a-f0-9]{64}$/);
  });

  it('upload + download roundtrip', async () => {
    const data = Buffer.from('soulchain test data');
    const cid = await storage.upload(data, 'doc.enc');
    const result = await storage.download(cid);
    expect(result).toEqual(data);
  });

  it('exists returns true for uploaded, false for unknown', async () => {
    const cid = await storage.upload(Buffer.from('x'), 'x');
    expect(await storage.exists(cid)).toBe(true);
    expect(await storage.exists('nonexistent')).toBe(false);
  });

  it('download throws for unknown CID', async () => {
    await expect(storage.download('bad')).rejects.toThrow('Not found');
  });

  it('same content produces same CID', async () => {
    const data = Buffer.from('deterministic');
    const cid1 = await storage.upload(data, 'a');
    const cid2 = await storage.upload(data, 'b');
    expect(cid1).toBe(cid2);
  });

  it('pin/unpin work for existing CIDs', async () => {
    const cid = await storage.upload(Buffer.from('pin me'), 'p');
    await expect(storage.pin!(cid)).resolves.toBeUndefined();
    await expect(storage.unpin!(cid)).resolves.toBeUndefined();
  });

  it('pin throws for unknown CID', async () => {
    await expect(storage.pin!('nope')).rejects.toThrow('Not found');
  });
});
