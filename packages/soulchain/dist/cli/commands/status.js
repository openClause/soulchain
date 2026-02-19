"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statusCommand = void 0;
const commander_1 = require("commander");
const index_1 = require("../../core/index");
const branding_1 = require("../branding");
exports.statusCommand = new commander_1.Command('status')
    .description('Show sync status, chain connection, pending queue')
    .action(() => {
    const workspaceDir = process.cwd();
    try {
        const config = (0, index_1.loadConfig)(workspaceDir);
        (0, branding_1.printHeader)();
        const green = branding_1.colors.green('●');
        const dim = branding_1.colors.dim;
        console.log(`  ${dim('Chain:')}      ${branding_1.colors.purple(String(config.chain))}          ${green} ${branding_1.colors.green('connected')}`);
        console.log(`  ${dim('Storage:')}    ${branding_1.colors.cyan(String(config.storage))}              ${green} ${branding_1.colors.green('active')}`);
        console.log(`  ${dim('Keystore:')}   ${branding_1.colors.cyan(config.keystorePath)}   🔐 ${dim('locked')}`);
        console.log(`  ${dim('Sync:')}       ${branding_1.colors.cyan(config.syncMode)}`);
        console.log(`  ${dim('Files:')}      ${branding_1.colors.green(config.trackedPaths.length + ' tracked')}`);
        if (config.trackedPaths.length > 0) {
            console.log('');
            for (const p of config.trackedPaths) {
                console.log(`    ${branding_1.colors.dim('·')} ${branding_1.colors.cyan(p)}`);
            }
        }
        console.log('');
    }
    catch (err) {
        console.error((0, branding_1.error)('Not initialized. Run `soulchain init` first.'));
        console.error(`   ${branding_1.colors.dim(err.message)}`);
        process.exit(1);
    }
});
