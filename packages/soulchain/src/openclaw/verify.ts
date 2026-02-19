import type { SyncEngine, IntegrityReport, SoulchainConfig } from '../core/index';

export async function verifyOnStartup(
  engine: SyncEngine,
  _config: SoulchainConfig
): Promise<IntegrityReport> {
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
