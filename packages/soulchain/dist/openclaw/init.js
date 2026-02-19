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
exports.initSoulchain = initSoulchain;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const index_1 = require("../core/index");
const crypto_provider_1 = require("./crypto-provider");
async function initSoulchain(workspaceDir, options) {
    const passphrase = options.passphrase ?? 'soulchain-dev';
    const autoMigrate = options.autoMigrate ?? true;
    // 1. Generate keypair
    const keypair = (0, index_1.generateKeypair)();
    const pubHex = (0, index_1.toHex)(keypair.publicKey);
    const address = (0, index_1.publicKeyToAddress)(keypair.publicKey);
    // 2. Create keystore
    const keystoreDir = path.join(workspaceDir, '.soulchain');
    if (!fs.existsSync(keystoreDir)) {
        fs.mkdirSync(keystoreDir, { recursive: true });
    }
    const keystorePath = path.join(keystoreDir, 'keystore.json');
    const keystoreData = await (0, index_1.createKeystore)(keypair.secretKey, passphrase);
    fs.writeFileSync(keystorePath, JSON.stringify(keystoreData, null, 2));
    // 3. Create config
    const config = {
        ...index_1.DEFAULT_CONFIG,
        chain: options.chain,
        storage: options.storage,
        keystorePath: path.relative(workspaceDir, keystorePath),
    };
    const configPath = path.join(workspaceDir, 'soulchain.config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    // 4. Register on chain
    // Use mock for init (real chain requires funded wallet + deployed contract)
    const chain = new index_1.MockChainProvider();
    const storage = (0, index_1.createStorageAdapter)(config);
    const cryptoProvider = (0, crypto_provider_1.createCryptoProvider)(keypair);
    const engine = new index_1.SyncEngine(config, cryptoProvider, storage, chain);
    const registrationTx = await chain.registerSoul();
    // 5-6. Migrate existing files
    let migration;
    if (autoMigrate) {
        migration = await engine.migrateExisting(workspaceDir, config.trackedPaths);
    }
    return {
        publicKey: pubHex,
        address,
        keystorePath,
        configPath,
        registrationTx,
        migration,
    };
}
