"use strict";
// @openclaused/soulchain — unified entry point
// Re-exports everything from core + openclaw + dashboard
Object.defineProperty(exports, "__esModule", { value: true });
exports.DASHBOARD_VERSION = exports.createCryptoProvider = exports.getEngine = exports.deactivate = exports.activate = exports.initSoulchain = exports.verifyOnStartup = exports.FileWatcher = exports.SoulchainHook = exports.DEFAULT_CONFIG = exports.loadConfig = exports.createChainProvider = exports.PublicAnchor = exports.SelfHostedChain = exports.CHAINS = exports.EVMChainProvider = exports.BASE_NETWORKS = exports.BaseChainProvider = exports.MockChainProvider = exports.SyncQueue = exports.SyncWorker = exports.SyncEngine = exports.ArweaveStorageAdapter = exports.IpfsStorageAdapter = exports.MockStorageAdapter = exports.createStorageAdapter = exports.SoulDocumentType = exports.fromBase64Url = exports.toBase64Url = exports.fromHex = exports.toHex = exports.contentHash = exports.sha256 = exports.unlockKeystore = exports.createKeystore = exports.deriveDocumentKey = exports.decrypt = exports.encrypt = exports.verify = exports.sign = exports.publicKeyToAddress = exports.keypairFromSeed = exports.generateKeypair = void 0;
// Core exports
var index_1 = require("./core/index");
Object.defineProperty(exports, "generateKeypair", { enumerable: true, get: function () { return index_1.generateKeypair; } });
Object.defineProperty(exports, "keypairFromSeed", { enumerable: true, get: function () { return index_1.keypairFromSeed; } });
Object.defineProperty(exports, "publicKeyToAddress", { enumerable: true, get: function () { return index_1.publicKeyToAddress; } });
Object.defineProperty(exports, "sign", { enumerable: true, get: function () { return index_1.sign; } });
Object.defineProperty(exports, "verify", { enumerable: true, get: function () { return index_1.verify; } });
Object.defineProperty(exports, "encrypt", { enumerable: true, get: function () { return index_1.encrypt; } });
Object.defineProperty(exports, "decrypt", { enumerable: true, get: function () { return index_1.decrypt; } });
Object.defineProperty(exports, "deriveDocumentKey", { enumerable: true, get: function () { return index_1.deriveDocumentKey; } });
Object.defineProperty(exports, "createKeystore", { enumerable: true, get: function () { return index_1.createKeystore; } });
Object.defineProperty(exports, "unlockKeystore", { enumerable: true, get: function () { return index_1.unlockKeystore; } });
Object.defineProperty(exports, "sha256", { enumerable: true, get: function () { return index_1.sha256; } });
Object.defineProperty(exports, "contentHash", { enumerable: true, get: function () { return index_1.contentHash; } });
Object.defineProperty(exports, "toHex", { enumerable: true, get: function () { return index_1.toHex; } });
Object.defineProperty(exports, "fromHex", { enumerable: true, get: function () { return index_1.fromHex; } });
Object.defineProperty(exports, "toBase64Url", { enumerable: true, get: function () { return index_1.toBase64Url; } });
Object.defineProperty(exports, "fromBase64Url", { enumerable: true, get: function () { return index_1.fromBase64Url; } });
Object.defineProperty(exports, "SoulDocumentType", { enumerable: true, get: function () { return index_1.SoulDocumentType; } });
Object.defineProperty(exports, "createStorageAdapter", { enumerable: true, get: function () { return index_1.createStorageAdapter; } });
Object.defineProperty(exports, "MockStorageAdapter", { enumerable: true, get: function () { return index_1.MockStorageAdapter; } });
Object.defineProperty(exports, "IpfsStorageAdapter", { enumerable: true, get: function () { return index_1.IpfsStorageAdapter; } });
Object.defineProperty(exports, "ArweaveStorageAdapter", { enumerable: true, get: function () { return index_1.ArweaveStorageAdapter; } });
Object.defineProperty(exports, "SyncEngine", { enumerable: true, get: function () { return index_1.SyncEngine; } });
Object.defineProperty(exports, "SyncWorker", { enumerable: true, get: function () { return index_1.SyncWorker; } });
Object.defineProperty(exports, "SyncQueue", { enumerable: true, get: function () { return index_1.SyncQueue; } });
Object.defineProperty(exports, "MockChainProvider", { enumerable: true, get: function () { return index_1.MockChainProvider; } });
Object.defineProperty(exports, "BaseChainProvider", { enumerable: true, get: function () { return index_1.BaseChainProvider; } });
Object.defineProperty(exports, "BASE_NETWORKS", { enumerable: true, get: function () { return index_1.BASE_NETWORKS; } });
Object.defineProperty(exports, "EVMChainProvider", { enumerable: true, get: function () { return index_1.EVMChainProvider; } });
Object.defineProperty(exports, "CHAINS", { enumerable: true, get: function () { return index_1.CHAINS; } });
Object.defineProperty(exports, "SelfHostedChain", { enumerable: true, get: function () { return index_1.SelfHostedChain; } });
Object.defineProperty(exports, "PublicAnchor", { enumerable: true, get: function () { return index_1.PublicAnchor; } });
Object.defineProperty(exports, "createChainProvider", { enumerable: true, get: function () { return index_1.createChainProvider; } });
Object.defineProperty(exports, "loadConfig", { enumerable: true, get: function () { return index_1.loadConfig; } });
Object.defineProperty(exports, "DEFAULT_CONFIG", { enumerable: true, get: function () { return index_1.DEFAULT_CONFIG; } });
// OpenClaw integration exports
var index_2 = require("./openclaw/index");
Object.defineProperty(exports, "SoulchainHook", { enumerable: true, get: function () { return index_2.SoulchainHook; } });
Object.defineProperty(exports, "FileWatcher", { enumerable: true, get: function () { return index_2.FileWatcher; } });
Object.defineProperty(exports, "verifyOnStartup", { enumerable: true, get: function () { return index_2.verifyOnStartup; } });
Object.defineProperty(exports, "initSoulchain", { enumerable: true, get: function () { return index_2.initSoulchain; } });
Object.defineProperty(exports, "activate", { enumerable: true, get: function () { return index_2.activate; } });
Object.defineProperty(exports, "deactivate", { enumerable: true, get: function () { return index_2.deactivate; } });
Object.defineProperty(exports, "getEngine", { enumerable: true, get: function () { return index_2.getEngine; } });
Object.defineProperty(exports, "createCryptoProvider", { enumerable: true, get: function () { return index_2.createCryptoProvider; } });
// Dashboard exports
var index_3 = require("./dashboard/index");
Object.defineProperty(exports, "DASHBOARD_VERSION", { enumerable: true, get: function () { return index_3.VERSION; } });
