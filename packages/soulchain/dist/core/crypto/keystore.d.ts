export interface KeystoreData {
    version: 1;
    algorithm: 'argon2id';
    salt: string;
    iv: string;
    ciphertext: string;
    tag: string;
}
export declare function createKeystore(secretKey: Uint8Array, passphrase: string): Promise<KeystoreData>;
export declare function unlockKeystore(keystore: KeystoreData, passphrase: string): Promise<Uint8Array>;
