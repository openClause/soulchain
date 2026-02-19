import { describe, it, expect } from 'vitest';
import { deriveDocumentKey } from '../../src/crypto/key-derivation';
import { randomBytes } from 'crypto';

describe('key-derivation', () => {
  const master = randomBytes(32);

  it('same inputs produce same key', () => {
    const k1 = deriveDocumentKey(master, 'soul', 1);
    const k2 = deriveDocumentKey(master, 'soul', 1);
    expect(Buffer.from(k1)).toEqual(Buffer.from(k2));
  });

  it('different version produces different key', () => {
    const k1 = deriveDocumentKey(master, 'soul', 1);
    const k2 = deriveDocumentKey(master, 'soul', 2);
    expect(Buffer.from(k1)).not.toEqual(Buffer.from(k2));
  });

  it('different docType produces different key', () => {
    const k1 = deriveDocumentKey(master, 'soul', 1);
    const k2 = deriveDocumentKey(master, 'memory', 1);
    expect(Buffer.from(k1)).not.toEqual(Buffer.from(k2));
  });

  it('derived key is 32 bytes', () => {
    const k = deriveDocumentKey(master, 'soul', 1);
    expect(k.length).toBe(32);
  });
});
