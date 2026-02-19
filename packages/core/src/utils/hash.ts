import { createHash } from 'crypto';
import { readFileSync } from 'fs';

export function sha256(data: Buffer | string): string {
  return createHash('sha256').update(data).digest('hex');
}

export function contentHash(filepath: string): string {
  const content = readFileSync(filepath);
  return sha256(content);
}
