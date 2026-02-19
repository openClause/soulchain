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
exports.exportCommand = void 0;
const commander_1 = require("commander");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const core_1 = require("@openclaused/core");
const branding_1 = require("../branding");
exports.exportCommand = new commander_1.Command('export')
    .description('Export entire soul as encrypted bundle')
    .option('-o, --output <file>', 'output file', 'soul.soulchain-bundle')
    .action((opts) => {
    const workspaceDir = process.cwd();
    try {
        const config = (0, core_1.loadConfig)(workspaceDir);
        console.log((0, branding_1.info)('Exporting soul...'));
        console.log('');
        const bundle = {
            version: 1,
            timestamp: new Date().toISOString(),
            chain: config.chain,
            storage: config.storage,
            files: {},
        };
        for (const tracked of config.trackedPaths) {
            const fullPath = path.resolve(workspaceDir, tracked);
            if (fs.existsSync(fullPath)) {
                const content = fs.readFileSync(fullPath, 'utf-8');
                bundle.files[tracked] = {
                    content: Buffer.from(content).toString('base64'),
                    hash: (0, core_1.sha256)(Buffer.from(content)),
                };
                console.log(`  ${branding_1.colors.dim('▸')} ${branding_1.colors.cyan(tracked)}`);
            }
        }
        const keystorePath = path.resolve(workspaceDir, config.keystorePath);
        if (fs.existsSync(keystorePath)) {
            bundle.keystore = JSON.parse(fs.readFileSync(keystorePath, 'utf-8'));
            console.log(`  ${branding_1.colors.dim('▸')} ${branding_1.colors.cyan('keystore')} 🔐`);
        }
        const outPath = path.resolve(workspaceDir, opts.output);
        fs.writeFileSync(outPath, JSON.stringify(bundle, null, 2));
        console.log('');
        console.log((0, branding_1.success)(`Exported ${Object.keys(bundle.files).length} files to ${branding_1.colors.cyan(opts.output)}`));
        console.log('');
    }
    catch (err) {
        console.error((0, branding_1.error)(err.message));
        process.exit(1);
    }
});
//# sourceMappingURL=export.js.map