export interface EncryptedData {
    ciphertext: Buffer;
    iv: Buffer;
    tag: Buffer;
}
export declare function encrypt(plaintext: Buffer, key: Uint8Array): EncryptedData;
export declare function decrypt(ciphertext: Buffer, key: Uint8Array, iv: Buffer, tag: Buffer): Buffer;
//# sourceMappingURL=encryption.d.ts.map