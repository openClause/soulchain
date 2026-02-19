import * as ed from '@noble/ed25519';
import { createHash, randomBytes } from 'crypto';
import { toHex } from '../utils/encoding';

// Required: set sha512 for noble/ed25519 v2
ed.etc.sha512Sync = (...m: Uint8Array[]) => {
  const h = createHash('sha512');
  for (const msg of m) h.update(msg);
  return new Uint8Array(h.digest());
};

export interface Keypair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

export function generateKeypair(): Keypair {
  const secretKey = randomBytes(32);
  const publicKey = ed.getPublicKey(secretKey);
  return { publicKey, secretKey: new Uint8Array(secretKey) };
}

export function keypairFromSeed(seed: Uint8Array): Keypair {
  if (seed.length !== 32) throw new Error('Seed must be 32 bytes');
  const publicKey = ed.getPublicKey(seed);
  return { publicKey, secretKey: new Uint8Array(seed) };
}

export function publicKeyToAddress(pubkey: Uint8Array): string {
  return toHex(pubkey);
}
