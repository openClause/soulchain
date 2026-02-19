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
exports.activate = activate;
exports.deactivate = deactivate;
exports.getEngine = getEngine;
const index_1 = require("../core/index");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const hook_1 = require("./hook");
const watcher_1 = require("./watcher");
const verify_1 = require("./verify");
const crypto_provider_1 = require("./crypto-provider");
let hook = null;
let watcher = null;
let engine = null;
async function activate(workspaceDir, passphrase) {
    // 1. Load config
    const config = (0, index_1.loadConfig)(workspaceDir);
    // 2. Unlock keystore
    const keystorePath = path.resolve(workspaceDir, config.keystorePath);
    const keystoreRaw = JSON.parse(fs.readFileSync(keystorePath, 'utf-8'));
    const pass = passphrase ?? process.env.SOULCHAIN_PASSPHRASE ?? 'soulchain-dev';
    const secretKey = await (0, index_1.unlockKeystore)(keystoreRaw, pass);
    const keypair = {
        secretKey: new Uint8Array(secretKey),
        publicKey: new Uint8Array(secretKey.slice(32)), // Ed25519: last 32 bytes of 64-byte secret = public
    };
    // 3. Create engine
    const chain = new index_1.MockChainProvider(); // TODO: real chain based on config
    const storage = (0, index_1.createStorageAdapter)(config);
    const cryptoProvider = (0, crypto_provider_1.createCryptoProvider)(keypair);
    engine = new index_1.SyncEngine(config, cryptoProvider, storage, chain);
    // 4. Install hooks
    hook = new hook_1.SoulchainHook(engine, workspaceDir, config.trackedPaths);
    hook.install();
    // 5. Start watcher
    watcher = new watcher_1.FileWatcher(config, engine);
    watcher.start();
    // 6. Verify
    await (0, verify_1.verifyOnStartup)(engine, config);
    console.log('[soulchain] ✅ Extension activated');
}
async function deactivate() {
    if (watcher) {
        watcher.stop();
        watcher = null;
    }
    if (hook) {
        hook.uninstall();
        hook = null;
    }
    engine = null;
    console.log('[soulchain] Extension deactivated');
}
function getEngine() {
    return engine;
}
