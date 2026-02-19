export function toHex(data: Uint8Array): string {
  return Buffer.from(data).toString('hex');
}

export function fromHex(hex: string): Uint8Array {
  return new Uint8Array(Buffer.from(hex, 'hex'));
}

export function toBase64Url(data: Uint8Array): string {
  return Buffer.from(data).toString('base64url');
}

export function fromBase64Url(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, 'base64url'));
}
