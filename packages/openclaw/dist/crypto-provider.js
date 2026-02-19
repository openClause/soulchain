"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCryptoProvider = createCryptoProvider;
const core_1 = require("@openclaused/core");
function createCryptoProvider(keypair) {
    return {
        encrypt(data) {
            // Use first 32 bytes of secret key as encryption key
            const key = Buffer.from(keypair.secretKey.slice(0, 32));
            return (0, core_1.encrypt)(data, key);
        },
        decrypt(enc) {
            const key = Buffer.from(keypair.secretKey.slice(0, 32));
            return (0, core_1.decrypt)(enc.ciphertext, key, enc.iv, enc.tag);
        },
        sign(data) {
            const sig = (0, core_1.sign)(data, keypair.secretKey);
            return (0, core_1.toHex)(sig);
        },
    };
}
//# sourceMappingURL=crypto-provider.js.map