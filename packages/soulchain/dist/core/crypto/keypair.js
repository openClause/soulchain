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
exports.generateKeypair = generateKeypair;
exports.keypairFromSeed = keypairFromSeed;
exports.publicKeyToAddress = publicKeyToAddress;
const ed = __importStar(require("@noble/ed25519"));
const crypto_1 = require("crypto");
const encoding_1 = require("../utils/encoding");
// Required: set sha512 for noble/ed25519 v2
ed.etc.sha512Sync = (...m) => {
    const h = (0, crypto_1.createHash)('sha512');
    for (const msg of m)
        h.update(msg);
    return new Uint8Array(h.digest());
};
function generateKeypair() {
    const secretKey = (0, crypto_1.randomBytes)(32);
    const publicKey = ed.getPublicKey(secretKey);
    return { publicKey, secretKey: new Uint8Array(secretKey) };
}
function keypairFromSeed(seed) {
    if (seed.length !== 32)
        throw new Error('Seed must be 32 bytes');
    const publicKey = ed.getPublicKey(seed);
    return { publicKey, secretKey: new Uint8Array(seed) };
}
function publicKeyToAddress(pubkey) {
    return (0, encoding_1.toHex)(pubkey);
}
