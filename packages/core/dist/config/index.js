"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = void 0;
exports.loadConfig = loadConfig;
const fs_1 = require("fs");
const path_1 = require("path");
const defaults_1 = require("./defaults");
var defaults_2 = require("./defaults");
Object.defineProperty(exports, "DEFAULT_CONFIG", { enumerable: true, get: function () { return defaults_2.DEFAULT_CONFIG; } });
function loadConfig(workspaceDir) {
    const jsonPath = (0, path_1.join)(workspaceDir, 'soulchain.config.json');
    let userConfig = {};
    if ((0, fs_1.existsSync)(jsonPath)) {
        const raw = (0, fs_1.readFileSync)(jsonPath, 'utf-8');
        userConfig = JSON.parse(raw);
    }
    const config = {
        ...defaults_1.DEFAULT_CONFIG,
        ...userConfig,
    };
    // Validate
    if (typeof config.chain === 'string') {
        const validChains = ['base', 'base-sepolia', 'localhost', 'arbitrum', 'optimism', 'polygon', 'ethereum', 'mock'];
        if (!validChains.includes(config.chain)) {
            throw new Error(`Invalid chain: ${config.chain}`);
        }
    }
    else if (typeof config.chain === 'object') {
        if (!['public', 'self-hosted', 'custom'].includes(config.chain.type)) {
            throw new Error(`Invalid chain type: ${config.chain.type}`);
        }
    }
    if (!['ipfs', 'arweave', 'mock'].includes(config.storage)) {
        throw new Error(`Invalid storage: ${config.storage}`);
    }
    if (!config.keystorePath) {
        throw new Error('keystorePath is required');
    }
    return config;
}
//# sourceMappingURL=index.js.map