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
exports.SoulchainHook = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Get the mutable CommonJS fs module for monkey-patching (import * creates frozen namespace)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mutableFs = require('fs');
class SoulchainHook {
    engine;
    trackedPaths;
    workspaceDir;
    installed = false;
    // Store originals
    originalWriteFileSync = fs.writeFileSync;
    originalWriteFile = fs.writeFile;
    originalPromisesWriteFile = fs.promises.writeFile;
    constructor(engine, workspaceDir, trackedPaths) {
        this.engine = engine;
        this.workspaceDir = path.resolve(workspaceDir);
        this.trackedPaths = new Set(trackedPaths.map(p => path.resolve(workspaceDir, p)));
    }
    install() {
        if (this.installed)
            return;
        const self = this;
        const origSync = this.originalWriteFileSync;
        const origAsync = this.originalWriteFile;
        const origPromises = this.originalPromisesWriteFile;
        // Patch writeFileSync
        mutableFs.writeFileSync = function patchedWriteFileSync(file, data, options) {
            origSync.call(fs, file, data, options);
            self.maybeIntercept(file, data);
        };
        // Patch writeFile (callback)
        mutableFs.writeFile = function patchedWriteFile(file, data, optionsOrCb, cb) {
            const callback = typeof optionsOrCb === 'function' ? optionsOrCb : cb;
            const options = typeof optionsOrCb === 'function' ? undefined : optionsOrCb;
            const args = [file, data];
            if (options)
                args.push(options);
            args.push((err) => {
                if (!err)
                    self.maybeIntercept(file, data);
                if (callback)
                    callback(err);
            });
            origAsync.apply(fs, args);
        };
        // Patch promises.writeFile
        mutableFs.promises.writeFile = async function patchedPromisesWriteFile(file, data, options) {
            await origPromises.call(fs.promises, file, data, options);
            self.maybeIntercept(file, data);
        };
        this.installed = true;
    }
    uninstall() {
        if (!this.installed)
            return;
        mutableFs.writeFileSync = this.originalWriteFileSync;
        mutableFs.writeFile = this.originalWriteFile;
        mutableFs.promises.writeFile = this.originalPromisesWriteFile;
        this.installed = false;
    }
    maybeIntercept(file, data) {
        if (typeof file !== 'string')
            return;
        const resolved = path.resolve(file);
        if (!this.trackedPaths.has(resolved))
            return;
        this.onWrite(resolved, Buffer.isBuffer(data) ? data : Buffer.from(String(data)));
    }
    onWrite(filepath, data) {
        // Fire and forget — don't block the caller
        const relativePath = path.relative(this.workspaceDir, filepath);
        this.engine.onFileWrite(relativePath, data).catch(err => {
            console.error(`[soulchain] sync error for ${relativePath}:`, err.message);
        });
    }
}
exports.SoulchainHook = SoulchainHook;
//# sourceMappingURL=hook.js.map