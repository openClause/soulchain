"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveDocumentKey = deriveDocumentKey;
const crypto_1 = require("crypto");
function deriveDocumentKey(masterKey, docType, version) {
    const info = `${docType}:${version}`;
    const derived = (0, crypto_1.hkdfSync)('sha256', masterKey, Buffer.alloc(0), info, 32);
    return new Uint8Array(derived);
}
//# sourceMappingURL=key-derivation.js.map