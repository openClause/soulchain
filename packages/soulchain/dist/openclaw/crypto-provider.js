"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCryptoProvider = createCryptoProvider;
const index_1 = require("../core/index");
function createCryptoProvider(keypair) {
    return {
        encrypt(data) {
            // Use first 32 bytes of secret key as encryption key
            const key = Buffer.from(keypair.secretKey.slice(0, 32));
            return (0, index_1.encrypt)(data, key);
        },
        decrypt(enc) {
            const key = Buffer.from(keypair.secretKey.slice(0, 32));
            return (0, index_1.decrypt)(enc.ciphertext, key, enc.iv, enc.tag);
        },
        sign(data) {
            const sig = (0, index_1.sign)(data, keypair.secretKey);
            return (0, index_1.toHex)(sig);
        },
    };
}
