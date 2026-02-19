import { encrypt, decrypt, sign, toHex } from '../core/index';
import type { EncryptedData, CryptoProvider, Keypair } from '../core/index';

export function createCryptoProvider(keypair: Keypair): CryptoProvider {
  return {
    encrypt(data: Buffer): EncryptedData {
      // Use first 32 bytes of secret key as encryption key
      const key = Buffer.from(keypair.secretKey.slice(0, 32));
      return encrypt(data, key);
    },
    decrypt(enc: EncryptedData): Buffer {
      const key = Buffer.from(keypair.secretKey.slice(0, 32));
      return decrypt(enc.ciphertext, key, enc.iv, enc.tag);
    },
    sign(data: Buffer): string {
      const sig = sign(data, keypair.secretKey);
      return toHex(sig);
    },
  };
}
