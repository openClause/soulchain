"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyCommand = void 0;
const commander_1 = require("commander");
const index_1 = require("../../openclaw/index");
const branding_1 = require("../branding");
exports.verifyCommand = new commander_1.Command('verify')
    .description('Verify all files against chain')
    .action(async () => {
    const workspaceDir = process.cwd();
    try {
        await (0, index_1.activate)(workspaceDir);
        const engine = (0, index_1.getEngine)();
        if (!engine) {
            console.error((0, branding_1.error)('Failed to initialize engine'));
            process.exit(1);
        }
        console.log((0, branding_1.info)('Verifying integrity...'));
        console.log('');
        const report = await engine.verifyIntegrity();
        if (report.tampered.length > 0) {
            for (const f of report.tampered) {
                console.log(`  ${(0, branding_1.warn)(f + '  TAMPERED')}`);
            }
        }
        if (report.missing.length > 0) {
            for (const f of report.missing) {
                console.log(`  ${(0, branding_1.error)(f + '  MISSING')}`);
            }
        }
        if (report.untracked.length > 0) {
            for (const f of report.untracked) {
                console.log(`  ${branding_1.colors.cyan('📄 UNTRACKED: ' + f)}`);
            }
        }
        console.log('');
        const parts = [
            branding_1.colors.green(`${report.verified} verified`),
            report.tampered.length > 0 ? branding_1.colors.yellow(`${report.tampered.length} tampered`) : branding_1.colors.dim(`${report.tampered.length} tampered`),
            report.missing.length > 0 ? branding_1.colors.red(`${report.missing.length} missing`) : branding_1.colors.dim(`${report.missing.length} missing`),
        ];
        console.log(`  Results: ${parts.join(branding_1.colors.dim(' | '))}`);
        console.log('');
        await (0, index_1.deactivate)();
        if (report.tampered.length > 0)
            process.exit(1);
    }
    catch (err) {
        console.error((0, branding_1.error)(err.message));
        process.exit(1);
    }
});
