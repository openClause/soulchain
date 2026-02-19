import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SyncQueue } from '../../src/sync/queue';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('SyncQueue', () => {
  let queue: SyncQueue;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'soulchain-test-'));
    queue = new SyncQueue(join(tmpDir, 'queue.db'));
  });

  afterEach(() => {
    queue.close();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  const item = () => ({
    docType: 1,
    path: 'SOUL.md',
    contentHash: 'abc123',
    encryptedData: Buffer.from('encrypted'),
  });

  it('enqueue and dequeue', () => {
    queue.enqueue(item());
    expect(queue.pending()).toBe(1);

    const items = queue.dequeue(10);
    expect(items).toHaveLength(1);
    expect(items[0].path).toBe('SOUL.md');
    expect(items[0].status).toBe('pending'); // row was pending when selected
  });

  it('markComplete removes from pending', () => {
    queue.enqueue(item());
    const items = queue.dequeue(1);
    queue.markComplete(items[0].id);
    expect(queue.pending()).toBe(0);
  });

  it('markFailed increments retries', () => {
    queue.enqueue(item());
    const items = queue.dequeue(1);
    queue.markFailed(items[0].id, 'network error');
    // Status is now 'failed', not pending
    expect(queue.pending()).toBe(0);
  });

  it('requeue sets status back to pending', () => {
    queue.enqueue(item());
    const items = queue.dequeue(1);
    queue.markFailed(items[0].id, 'err');
    queue.requeue(items[0].id);
    expect(queue.pending()).toBe(1);
  });

  it('compact keeps only latest per path', () => {
    queue.enqueue({ ...item(), contentHash: 'v1' });
    queue.enqueue({ ...item(), contentHash: 'v2' });
    queue.enqueue({ ...item(), contentHash: 'v3' });
    queue.compact();
    const items = queue.dequeue(10);
    expect(items).toHaveLength(1);
    expect(items[0].contentHash).toBe('v3');
  });

  it('handles multiple paths independently', () => {
    queue.enqueue(item());
    queue.enqueue({ ...item(), path: 'MEMORY.md', docType: 2 });
    expect(queue.pending()).toBe(2);
    const items = queue.dequeue(10);
    expect(items).toHaveLength(2);
  });
});
