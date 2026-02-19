import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../../src/crypto/encryption';
import { randomBytes } from 'crypto';

describe('encryption', () => {
  const key = randomBytes(32);
  const plaintext = Buffer.from('hello soulchain');

  it('encrypt/decrypt roundtrip', () => {
    const { ciphertext, iv, tag } = encrypt(plaintext, key);
    const result = decrypt(ciphertext, key, iv, tag);
    expect(result).toEqual(plaintext);
  });

  it('different keys produce different ciphertext', () => {
    const key2 = randomBytes(32);
    const enc1 = encrypt(plaintext, key);
    const enc2 = encrypt(plaintext, key2);
    expect(enc1.ciphertext).not.toEqual(enc2.ciphertext);
  });

  it('wrong key fails to decrypt', () => {
    const { ciphertext, iv, tag } = encrypt(plaintext, key);
    const wrongKey = randomBytes(32);
    expect(() => decrypt(ciphertext, wrongKey, iv, tag)).toThrow();
  });
});
