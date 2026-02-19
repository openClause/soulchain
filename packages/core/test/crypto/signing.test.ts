import { describe, it, expect } from 'vitest';
import { sign, verify } from '../../src/crypto/signing';
import { generateKeypair } from '../../src/crypto/keypair';

describe('signing', () => {
  it('sign and verify', () => {
    const kp = generateKeypair();
    const message = new Uint8Array([1, 2, 3, 4]);
    const sig = sign(message, kp.secretKey);
    expect(sig.length).toBe(64);
    expect(verify(message, sig, kp.publicKey)).toBe(true);
  });

  it('tampered message fails verification', () => {
    const kp = generateKeypair();
    const message = new Uint8Array([1, 2, 3, 4]);
    const sig = sign(message, kp.secretKey);
    const tampered = new Uint8Array([1, 2, 3, 5]);
    expect(verify(tampered, sig, kp.publicKey)).toBe(false);
  });

  it('wrong public key fails verification', () => {
    const kp1 = generateKeypair();
    const kp2 = generateKeypair();
    const message = new Uint8Array([1, 2, 3]);
    const sig = sign(message, kp1.secretKey);
    expect(verify(message, sig, kp2.publicKey)).toBe(false);
  });
});
