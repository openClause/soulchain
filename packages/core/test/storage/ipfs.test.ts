import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IpfsStorageAdapter } from '../../src/storage/ipfs';

describe('IpfsStorageAdapter', () => {
  let adapter: IpfsStorageAdapter;

  beforeEach(() => {
    adapter = new IpfsStorageAdapter({
      apiKey: 'test-key',
      apiSecret: 'test-secret',
      gateway: 'https://gw.test/ipfs/',
    });
  });

  it('upload calls Pinata API and returns CID', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ IpfsHash: 'QmTestCid123' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const cid = await adapter.upload(Buffer.from('test'), 'file.txt');
    expect(cid).toBe('QmTestCid123');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      expect.objectContaining({ method: 'POST' }),
    );

    vi.unstubAllGlobals();
  });

  it('download fetches from gateway', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
    });
    vi.stubGlobal('fetch', mockFetch);

    await adapter.download('QmTest');
    expect(mockFetch).toHaveBeenCalledWith('https://gw.test/ipfs/QmTest');

    vi.unstubAllGlobals();
  });

  it('exists checks pin status', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ count: 1 }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await adapter.exists('QmTest');
    expect(result).toBe(true);

    vi.unstubAllGlobals();
  });

  it('upload throws on API error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(adapter.upload(Buffer.from('x'), 'f')).rejects.toThrow('Pinata upload failed');

    vi.unstubAllGlobals();
  });
});
