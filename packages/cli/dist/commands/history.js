"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.historyCommand = void 0;
const commander_1 = require("commander");
const core_1 = require("@soulchain/core");
const branding_1 = require("../branding");
exports.historyCommand = new commander_1.Command('history')
    .description('Show version history for a file')
    .argument('[path]', 'file to show history for', 'SOUL.md')
    .action(async (filePath) => {
    const workspaceDir = process.cwd();
    try {
        const config = (0, core_1.loadConfig)(workspaceDir);
        const chain = new core_1.MockChainProvider();
        const lower = filePath.toLowerCase();
        let docType = 0;
        if (lower.includes('memory'))
            docType = 1;
        else if (lower.includes('agents'))
            docType = 2;
        else if (lower.includes('user'))
            docType = 3;
        const count = await chain.documentCount(docType);
        if (count === 0) {
            console.log(branding_1.colors.dim(`No history found for ${filePath}`));
            return;
        }
        console.log((0, branding_1.info)(`Version history: ${filePath}`));
        console.log('');
        for (let v = 0; v < count; v++) {
            const doc = await chain.documentAt(docType, v);
            if (doc) {
                const date = new Date(doc.timestamp).toISOString().slice(0, 16).replace('T', ' ');
                const isLatest = v === count - 1;
                const vStr = `v${doc.version}`.padEnd(5);
                const hashStr = doc.contentHash.slice(0, 16) + '...';
                if (isLatest) {
                    console.log(`  ${branding_1.colors.green(vStr)} ${branding_1.colors.dim(date)}  ${branding_1.colors.dim('hash:')} ${branding_1.colors.cyan(hashStr)}  ${branding_1.colors.dim('cid:')} ${branding_1.colors.cyan(doc.cid)}`);
                }
                else {
                    console.log(`  ${branding_1.colors.dim(vStr)} ${branding_1.colors.dim(date)}  ${branding_1.colors.dim('hash:')} ${branding_1.colors.dim(hashStr)}  ${branding_1.colors.dim('cid:')} ${branding_1.colors.dim(doc.cid)}`);
                }
            }
        }
        console.log('');
    }
    catch (err) {
        console.error(branding_1.colors.red(`❌ ${err.message}`));
        process.exit(1);
    }
});
//# sourceMappingURL=history.js.map