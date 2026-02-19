"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createKeystore = createKeystore;
exports.unlockKeystore = unlockKeystore;
const argon2 = __importStar(require("argon2"));
const crypto_1 = require("crypto");
async function createKeystore(secretKey, passphrase) {
    const salt = (0, crypto_1.randomBytes)(32);
    // Use argon2id to derive an encryption key from passphrase
    const derived = await argon2.hash(passphrase, {
        salt,
        type: argon2.argon2id,
        raw: true,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 1,
        hashLength: 32,
    });
    const iv = (0, crypto_1.randomBytes)(12);
    const cipher = (0, crypto_1.createCipheriv)('aes-256-gcm', derived, iv);
    const ciphertext = Buffer.concat([cipher.update(secretKey), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
        version: 1,
        algorithm: 'argon2id',
        salt: salt.toString('hex'),
        iv: iv.toString('hex'),
        ciphertext: ciphertext.toString('hex'),
        tag: tag.toString('hex'),
    };
}
async function unlockKeystore(keystore, passphrase) {
    const salt = Buffer.from(keystore.salt, 'hex');
    const derived = await argon2.hash(passphrase, {
        salt,
        type: argon2.argon2id,
        raw: true,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 1,
        hashLength: 32,
    });
    const iv = Buffer.from(keystore.iv, 'hex');
    const ciphertext = Buffer.from(keystore.ciphertext, 'hex');
    const tag = Buffer.from(keystore.tag, 'hex');
    const decipher = (0, crypto_1.createDecipheriv)('aes-256-gcm', derived, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return new Uint8Array(plaintext);
}
