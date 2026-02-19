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
exports.importCommand = void 0;
const commander_1 = require("commander");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const branding_1 = require("../branding");
exports.importCommand = new commander_1.Command('import')
    .description('Import soul bundle into workspace')
    .argument('<file>', 'bundle file to import')
    .option('-y, --yes', 'skip confirmation')
    .action((file, _opts) => {
    const workspaceDir = process.cwd();
    try {
        const bundlePath = path.resolve(file);
        if (!fs.existsSync(bundlePath)) {
            console.error((0, branding_1.error)(`File not found: ${file}`));
            process.exit(1);
        }
        console.log((0, branding_1.info)('Importing soul bundle...'));
        console.log('');
        const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf-8'));
        if (bundle.version !== 1) {
            console.error((0, branding_1.error)(`Unsupported bundle version: ${bundle.version}`));
            process.exit(1);
        }
        let count = 0;
        for (const [filePath, data] of Object.entries(bundle.files)) {
            const fullPath = path.resolve(workspaceDir, filePath);
            const dir = path.dirname(fullPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const content = Buffer.from(data.content, 'base64');
            fs.writeFileSync(fullPath, content);
            console.log(`  ${branding_1.colors.dim('▸')} ${branding_1.colors.cyan(filePath)}`);
            count++;
        }
        if (bundle.keystore) {
            const keystoreDir = path.join(workspaceDir, '.soulchain');
            if (!fs.existsSync(keystoreDir)) {
                fs.mkdirSync(keystoreDir, { recursive: true });
            }
            fs.writeFileSync(path.join(keystoreDir, 'keystore.json'), JSON.stringify(bundle.keystore, null, 2));
            console.log(`  ${branding_1.colors.dim('▸')} ${branding_1.colors.cyan('keystore')} 🔐`);
        }
        console.log('');
        console.log((0, branding_1.success)(`Imported ${count} files from bundle.`));
        console.log('');
    }
    catch (err) {
        console.error((0, branding_1.error)(err.message));
        process.exit(1);
    }
});
