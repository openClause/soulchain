import { hkdfSync } from 'crypto';

export function deriveDocumentKey(masterKey: Uint8Array, docType: string, version: number): Uint8Array {
  const info = `${docType}:${version}`;
  const derived = hkdfSync('sha256', masterKey, Buffer.alloc(0), info, 32);
  return new Uint8Array(derived);
}
