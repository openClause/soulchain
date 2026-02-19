import { describe, it, expect } from 'vitest';
import { createKeystore, unlockKeystore } from '../../src/crypto/keystore';
import { randomBytes } from 'crypto';

describe('keystore', () => {
  it('create and unlock roundtrip', async () => {
    const secretKey = randomBytes(32);
    const ks = await createKeystore(new Uint8Array(secretKey), 'test-passphrase');
    expect(ks.version).toBe(1);
    expect(ks.algorithm).toBe('argon2id');
    const unlocked = await unlockKeystore(ks, 'test-passphrase');
    expect(Buffer.from(unlocked)).toEqual(secretKey);
  });

  it('wrong passphrase fails', async () => {
    const secretKey = randomBytes(32);
    const ks = await createKeystore(new Uint8Array(secretKey), 'correct');
    await expect(unlockKeystore(ks, 'wrong')).rejects.toThrow();
  });
});
