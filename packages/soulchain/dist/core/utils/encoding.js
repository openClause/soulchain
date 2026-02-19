"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toHex = toHex;
exports.fromHex = fromHex;
exports.toBase64Url = toBase64Url;
exports.fromBase64Url = fromBase64Url;
function toHex(data) {
    return Buffer.from(data).toString('hex');
}
function fromHex(hex) {
    return new Uint8Array(Buffer.from(hex, 'hex'));
}
function toBase64Url(data) {
    return Buffer.from(data).toString('base64url');
}
function fromBase64Url(b64) {
    return new Uint8Array(Buffer.from(b64, 'base64url'));
}
