"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
const crypto_1 = require("crypto");
function encrypt(plaintext, key) {
    if (key.length !== 32)
        throw new Error('Key must be 32 bytes for AES-256-GCM');
    const iv = (0, crypto_1.randomBytes)(12);
    const cipher = (0, crypto_1.createCipheriv)('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return { ciphertext, iv, tag };
}
function decrypt(ciphertext, key, iv, tag) {
    if (key.length !== 32)
        throw new Error('Key must be 32 bytes for AES-256-GCM');
    const decipher = (0, crypto_1.createDecipheriv)('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
