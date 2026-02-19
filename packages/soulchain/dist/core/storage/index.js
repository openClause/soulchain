"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArweaveStorageAdapter = exports.IpfsStorageAdapter = exports.MockStorageAdapter = void 0;
exports.createStorageAdapter = createStorageAdapter;
const mock_1 = require("./mock");
const ipfs_1 = require("./ipfs");
const arweave_1 = require("./arweave");
var mock_2 = require("./mock");
Object.defineProperty(exports, "MockStorageAdapter", { enumerable: true, get: function () { return mock_2.MockStorageAdapter; } });
var ipfs_2 = require("./ipfs");
Object.defineProperty(exports, "IpfsStorageAdapter", { enumerable: true, get: function () { return ipfs_2.IpfsStorageAdapter; } });
var arweave_2 = require("./arweave");
Object.defineProperty(exports, "ArweaveStorageAdapter", { enumerable: true, get: function () { return arweave_2.ArweaveStorageAdapter; } });
function createStorageAdapter(config, storageConfig) {
    switch (config.storage) {
        case 'ipfs':
            if (!storageConfig?.ipfs)
                throw new Error('IPFS config required (apiKey, apiSecret)');
            return new ipfs_1.IpfsStorageAdapter(storageConfig.ipfs);
        case 'arweave':
            return new arweave_1.ArweaveStorageAdapter(storageConfig?.arweave);
        case 'mock':
            return new mock_1.MockStorageAdapter();
        default:
            throw new Error(`Unknown storage type: ${config.storage}`);
    }
}
