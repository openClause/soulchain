import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export interface EncryptedData {
  ciphertext: Buffer;
  iv: Buffer;
  tag: Buffer;
}

export function encrypt(plaintext: Buffer, key: Uint8Array): EncryptedData {
  if (key.length !== 32) throw new Error('Key must be 32 bytes for AES-256-GCM');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ciphertext, iv, tag };
}

export function decrypt(ciphertext: Buffer, key: Uint8Array, iv: Buffer, tag: Buffer): Buffer {
  if (key.length !== 32) throw new Error('Key must be 32 bytes for AES-256-GCM');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
