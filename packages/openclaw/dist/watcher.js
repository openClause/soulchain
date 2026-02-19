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
exports.FileWatcher = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class FileWatcher {
    config;
    engine;
    watchers = [];
    debounceTimers = new Map();
    debounceMs = 500;
    constructor(config, engine) {
        this.config = config;
        this.engine = engine;
    }
    start() {
        for (const trackedPath of this.config.trackedPaths) {
            const resolved = path.resolve(trackedPath);
            try {
                const watcher = fs.watch(resolved, (_event) => {
                    this.handleChange(trackedPath, resolved);
                });
                this.watchers.push(watcher);
            }
            catch {
                // File may not exist yet — that's fine
            }
        }
    }
    stop() {
        for (const watcher of this.watchers) {
            watcher.close();
        }
        this.watchers = [];
        for (const timer of this.debounceTimers.values()) {
            clearTimeout(timer);
        }
        this.debounceTimers.clear();
    }
    handleChange(relativePath, absolutePath) {
        // Debounce
        const existing = this.debounceTimers.get(relativePath);
        if (existing)
            clearTimeout(existing);
        this.debounceTimers.set(relativePath, setTimeout(() => {
            this.debounceTimers.delete(relativePath);
            try {
                const content = fs.readFileSync(absolutePath);
                this.engine.onFileWrite(relativePath, content).catch(err => {
                    console.error(`[soulchain] watcher sync error for ${relativePath}:`, err.message);
                });
            }
            catch {
                // File may have been deleted
            }
        }, this.debounceMs));
    }
}
exports.FileWatcher = FileWatcher;
//# sourceMappingURL=watcher.js.map