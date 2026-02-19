"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyOnStartup = verifyOnStartup;
async function verifyOnStartup(engine, _config) {
    const report = await engine.verifyIntegrity();
    if (report.tampered.length > 0) {
        console.warn(`[soulchain] ⚠️  ${report.tampered.length} tampered file(s) detected:`);
        for (const f of report.tampered) {
            console.warn(`  - ${f}`);
        }
    }
    if (report.missing.length > 0) {
        console.warn(`[soulchain] ❌ ${report.missing.length} missing file(s):`);
        for (const f of report.missing) {
            console.warn(`  - ${f}`);
        }
    }
    if (report.tampered.length === 0 && report.missing.length === 0) {
        console.log(`[soulchain] ✅ All ${report.verified} tracked files verified against chain.`);
    }
    return report;
}
//# sourceMappingURL=verify.js.map