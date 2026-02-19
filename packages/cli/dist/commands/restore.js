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
exports.restoreCommand = void 0;
const commander_1 = require("commander");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const openclaw_1 = require("@soulchain/openclaw");
const branding_1 = require("../branding");
exports.restoreCommand = new commander_1.Command('restore')
    .description('Restore file(s) from chain')
    .argument('[path]', 'specific file to restore')
    .option('-v, --version <version>', 'specific version number', parseInt)
    .option('-y, --yes', 'skip confirmation')
    .action(async (filePath, opts) => {
    const workspaceDir = process.cwd();
    try {
        await (0, openclaw_1.activate)(workspaceDir);
        const engine = (0, openclaw_1.getEngine)();
        if (!engine) {
            console.error((0, branding_1.error)('Failed to initialize engine'));
            process.exit(1);
        }
        console.log((0, branding_1.info)('Restoring from chain...'));
        console.log('');
        if (filePath) {
            const versionStr = opts?.version !== undefined ? ` → v${opts.version}` : '';
            process.stdout.write(`  ↻ ${branding_1.colors.cyan(filePath)}${branding_1.colors.dim(versionStr)} ... `);
            const content = await engine.restoreFile(filePath, opts?.version);
            const fullPath = path.resolve(workspaceDir, filePath);
            fs.writeFileSync(fullPath, content);
            console.log(branding_1.colors.green('✅ restored'));
        }
        else {
            const report = await engine.verifyIntegrity();
            if (report.tampered.length === 0 && report.missing.length === 0) {
                console.log((0, branding_1.success)('All files are intact. Nothing to restore.'));
                await (0, openclaw_1.deactivate)();
                return;
            }
            const toRestore = [...report.tampered, ...report.missing];
            for (const f of toRestore) {
                try {
                    process.stdout.write(`  ↻ ${branding_1.colors.cyan(f)} ... `);
                    const content = await engine.restoreFile(f);
                    fs.writeFileSync(path.resolve(workspaceDir, f), content);
                    console.log(branding_1.colors.green('✅ restored'));
                }
                catch (err) {
                    console.log(branding_1.colors.red(`❌ ${err.message}`));
                }
            }
            console.log('');
            console.log((0, branding_1.success)(`${toRestore.length} file(s) restored from chain.`));
        }
        console.log('');
        await (0, openclaw_1.deactivate)();
    }
    catch (err) {
        console.error((0, branding_1.error)(err.message));
        process.exit(1);
    }
});
//# sourceMappingURL=restore.js.map