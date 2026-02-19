import { createHash, randomBytes, createCipheriv, createDecipheriv, generateKeyPairSync, diffieHellman, createPrivateKey, createPublicKey, KeyObject } from 'crypto';
import { hkdfSync } from 'crypto';

export interface AccessKey {
  ownerAddress: string;
  readerAddress: string;
  docType: number;
  encryptedSymKey: Buffer;  // The document's symmetric key, re-encrypted for the reader
  nonce: Buffer;            // Nonce used in encryption
}

export interface SharedKeypair {
  publicKey: Buffer;   // X25519 public key (32 bytes)
  secretKey: Buffer;   // X25519 private key (32 bytes)
}

/**
 * SharedAccessManager handles proxy re-encryption for selective document sharing.
 * 
 * When Agent A grants Agent B access to a document type:
 * 1. Agent A derives a shared secret using ECDH (A's X25519 private + B's X25519 public)
 * 2. Agent A encrypts the document's symmetric key with the shared secret
 * 3. The encrypted key is stored on-chain
 * 4. Agent B derives the same shared secret and decrypts the symmetric key
 * 5. Agent B uses the symmetric key to decrypt the actual document
 * 
 * Uses X25519 for ECDH key agreement + AES-256-GCM for symmetric encryption.
 */
export class SharedAccessManager {
  
  /**
   * Derive an X25519 keypair from an Ed25519 secret key.
   * Uses HKDF to derive a deterministic X25519 seed, then generates the keypair.
   */
  static deriveX25519Keypair(ed25519SecretKey: Uint8Array): SharedKeypair {
    const seed = ed25519SecretKey.slice(0, 32);
    const x25519Seed = Buffer.from(
      hkdfSync('sha256', seed, Buffer.alloc(0), 'soulchain-x25519-key', 32)
    );

    // Use Node.js crypto KeyObject API for X25519
    const privateKeyObj = createPrivateKey({
      key: Buffer.concat([
        // DER header for X25519 private key (PKCS#8)
        Buffer.from('302e020100300506032b656e04220420', 'hex'),
        x25519Seed,
      ]),
      format: 'der',
      type: 'pkcs8',
    });

    const publicKeyObj = createPublicKey(privateKeyObj);
    const publicKeyRaw = publicKeyObj.export({ type: 'spki', format: 'der' }).subarray(-32);

    return {
      publicKey: Buffer.from(publicKeyRaw),
      secretKey: x25519Seed,
    };
  }

  /** Convert raw X25519 private key bytes to KeyObject */
  private static toPrivateKeyObject(raw: Buffer): KeyObject {
    return createPrivateKey({
      key: Buffer.concat([
        Buffer.from('302e020100300506032b656e04220420', 'hex'),
        raw,
      ]),
      format: 'der',
      type: 'pkcs8',
    });
  }

  /** Convert raw X25519 public key bytes to KeyObject */
  private static toPublicKeyObject(raw: Buffer): KeyObject {
    return createPublicKey({
      key: Buffer.concat([
        Buffer.from('302a300506032b656e032100', 'hex'),
        raw,
      ]),
      format: 'der',
      type: 'spki',
    });
  }

  /**
   * Derive a shared secret between two X25519 keys using ECDH.
   */
  static deriveSharedSecret(mySecretKey: Buffer, theirPublicKey: Buffer): Buffer {
    const privKey = SharedAccessManager.toPrivateKeyObject(mySecretKey);
    const pubKey = SharedAccessManager.toPublicKeyObject(theirPublicKey);

    const shared = diffieHellman({ privateKey: privKey, publicKey: pubKey });
    // Run through HKDF for key derivation
    return Buffer.from(
      hkdfSync('sha256', shared, Buffer.alloc(0), 'soulchain-shared-access', 32)
    );
  }

  /**
   * Create an access key: encrypt a document's symmetric key for a specific reader.
   */
  async createAccessKey(
    ownerKeypair: { secretKey: Uint8Array },
    readerPublicKey: Buffer,
    docType: number,
    documentSymKey: Uint8Array,
    ownerAddress: string,
    readerAddress: string,
  ): Promise<AccessKey> {
    const ownerX25519 = SharedAccessManager.deriveX25519Keypair(ownerKeypair.secretKey);
    const sharedSecret = SharedAccessManager.deriveSharedSecret(ownerX25519.secretKey, readerPublicKey);
    
    // Encrypt the document's symmetric key with the shared secret
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', sharedSecret, nonce);
    const encrypted = Buffer.concat([
      cipher.update(Buffer.from(documentSymKey)),
      cipher.final(),
      cipher.getAuthTag(),
    ]);

    return {
      ownerAddress,
      readerAddress,
      docType,
      encryptedSymKey: encrypted,
      nonce,
    };
  }

  /**
   * Decrypt a document's symmetric key using a shared access key.
   */
  async decryptSymKey(
    readerKeypair: { secretKey: Uint8Array },
    ownerPublicKey: Buffer,
    accessKey: AccessKey,
  ): Promise<Buffer> {
    const readerX25519 = SharedAccessManager.deriveX25519Keypair(readerKeypair.secretKey);
    const sharedSecret = SharedAccessManager.deriveSharedSecret(readerX25519.secretKey, ownerPublicKey);
    
    // Split encrypted data: ciphertext + auth tag (16 bytes)
    const encrypted = accessKey.encryptedSymKey;
    const tag = encrypted.subarray(encrypted.length - 16);
    const ciphertext = encrypted.subarray(0, encrypted.length - 16);
    
    const decipher = createDecipheriv('aes-256-gcm', sharedSecret, accessKey.nonce);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }

  /**
   * Decrypt actual document content using a shared access key.
   * First decrypts the symmetric key, then uses it to decrypt the document.
   */
  async decryptWithAccess(
    readerKeypair: { secretKey: Uint8Array },
    ownerPublicKey: Buffer,
    accessKey: AccessKey,
    encryptedData: Buffer,
  ): Promise<Buffer> {
    const symKey = await this.decryptSymKey(readerKeypair, ownerPublicKey, accessKey);
    
    // Parse encrypted data: iv(12) + tag(16) + ciphertext
    const iv = encryptedData.subarray(0, 12);
    const tag = encryptedData.subarray(12, 28);
    const ciphertext = encryptedData.subarray(28);
    
    const decipher = createDecipheriv('aes-256-gcm', symKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }

  /**
   * Serialize an access key for on-chain storage.
   */
  static serializeAccessKey(key: AccessKey): Buffer {
    // Format: nonce(12) + encryptedSymKey(variable)
    return Buffer.concat([key.nonce, key.encryptedSymKey]);
  }

  /**
   * Deserialize an access key from on-chain storage.
   */
  static deserializeAccessKey(
    data: Buffer,
    ownerAddress: string,
    readerAddress: string,
    docType: number,
  ): AccessKey {
    return {
      ownerAddress,
      readerAddress,
      docType,
      nonce: data.subarray(0, 12),
      encryptedSymKey: data.subarray(12),
    };
  }

  /**
   * Store an access key on-chain via the chain provider.
   */
  async storeAccessKey(
    accessKey: AccessKey,
    chain: { storeAccessKey(reader: string, docType: number, data: Buffer): Promise<string> },
  ): Promise<string> {
    const serialized = SharedAccessManager.serializeAccessKey(accessKey);
    return chain.storeAccessKey(accessKey.readerAddress, accessKey.docType, serialized);
  }

  /**
   * Retrieve an access key from the chain.
   */
  async getAccessKey(
    ownerAddress: string,
    readerAddress: string,
    docType: number,
    chain: { getAccessKey(owner: string, reader: string, docType: number): Promise<Buffer | null> },
  ): Promise<AccessKey | null> {
    const data = await chain.getAccessKey(ownerAddress, readerAddress, docType);
    if (!data || data.length === 0) return null;
    return SharedAccessManager.deserializeAccessKey(data, ownerAddress, readerAddress, docType);
  }
}
