export interface Keypair {
    publicKey: Uint8Array;
    secretKey: Uint8Array;
}
export declare function generateKeypair(): Keypair;
export declare function keypairFromSeed(seed: Uint8Array): Keypair;
export declare function publicKeyToAddress(pubkey: Uint8Array): string;
//# sourceMappingURL=keypair.d.ts.map