"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = void 0;
exports.DEFAULT_CONFIG = {
    chain: {
        type: 'public',
        name: 'base-sepolia',
    },
    storage: 'mock',
    keystorePath: '~/.soulchain/keystore.json',
    trackedPaths: [
        'SOUL.md',
        'MEMORY.md',
        'AGENTS.md',
        'USER.md',
    ],
    syncMode: 'on-write',
    syncIntervalMs: 5000,
};
