"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256 = sha256;
exports.contentHash = contentHash;
const crypto_1 = require("crypto");
const fs_1 = require("fs");
function sha256(data) {
    return (0, crypto_1.createHash)('sha256').update(data).digest('hex');
}
function contentHash(filepath) {
    const content = (0, fs_1.readFileSync)(filepath);
    return sha256(content);
}
