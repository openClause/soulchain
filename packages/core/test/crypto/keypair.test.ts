import { describe, it, expect } from 'vitest';
import { generateKeypair, keypairFromSeed, publicKeyToAddress } from '../../src/crypto/keypair';

describe('keypair', () => {
  it('generates a keypair with correct sizes', () => {
    const kp = generateKeypair();
    expect(kp.publicKey).toBeInstanceOf(Uint8Array);
    expect(kp.secretKey).toBeInstanceOf(Uint8Array);
    expect(kp.publicKey.length).toBe(32);
    expect(kp.secretKey.length).toBe(32);
  });

  it('deterministic from seed', () => {
    const seed = new Uint8Array(32).fill(42);
    const kp1 = keypairFromSeed(seed);
    const kp2 = keypairFromSeed(seed);
    expect(Buffer.from(kp1.publicKey)).toEqual(Buffer.from(kp2.publicKey));
  });

  it('different seeds produce different keys', () => {
    const kp1 = keypairFromSeed(new Uint8Array(32).fill(1));
    const kp2 = keypairFromSeed(new Uint8Array(32).fill(2));
    expect(Buffer.from(kp1.publicKey)).not.toEqual(Buffer.from(kp2.publicKey));
  });

  it('publicKeyToAddress returns hex string', () => {
    const kp = generateKeypair();
    const addr = publicKeyToAddress(kp.publicKey);
    expect(addr).toMatch(/^[0-9a-f]{64}$/);
  });
});
