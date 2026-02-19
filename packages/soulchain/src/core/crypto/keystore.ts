import * as argon2 from 'argon2';
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

export interface KeystoreData {
  version: 1;
  algorithm: 'argon2id';
  salt: string;
  iv: string;
  ciphertext: string;
  tag: string;
}

export async function createKeystore(secretKey: Uint8Array, passphrase: string): Promise<KeystoreData> {
  const salt = randomBytes(32);
  // Use argon2id to derive an encryption key from passphrase
  const derived = await argon2.hash(passphrase, {
    salt,
    type: argon2.argon2id,
    raw: true,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
    hashLength: 32,
  });

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', derived, iv);
  const ciphertext = Buffer.concat([cipher.update(secretKey), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    version: 1,
    algorithm: 'argon2id',
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    ciphertext: ciphertext.toString('hex'),
    tag: tag.toString('hex'),
  };
}

export async function unlockKeystore(keystore: KeystoreData, passphrase: string): Promise<Uint8Array> {
  const salt = Buffer.from(keystore.salt, 'hex');
  const derived = await argon2.hash(passphrase, {
    salt,
    type: argon2.argon2id,
    raw: true,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
    hashLength: 32,
  });

  const iv = Buffer.from(keystore.iv, 'hex');
  const ciphertext = Buffer.from(keystore.ciphertext, 'hex');
  const tag = Buffer.from(keystore.tag, 'hex');

  const decipher = createDecipheriv('aes-256-gcm', derived, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return new Uint8Array(plaintext);
}
