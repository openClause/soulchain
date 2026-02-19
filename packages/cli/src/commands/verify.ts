import { Command } from 'commander';
import { activate, getEngine, deactivate } from '@soulchain/openclaw';
import { printHeader, success, warn, error, info, colors } from '../branding';

export const verifyCommand = new Command('verify')
  .description('Verify all files against chain')
  .action(async () => {
    const workspaceDir = process.cwd();

    try {
      await activate(workspaceDir);
      const engine = getEngine();
      if (!engine) {
        console.error(error('Failed to initialize engine'));
        process.exit(1);
      }

      console.log(info('Verifying integrity...'));
      console.log('');

      const report = await engine.verifyIntegrity();

      if (report.tampered.length > 0) {
        for (const f of report.tampered) {
          console.log(`  ${warn(f + '  TAMPERED')}`);
        }
      }
      if (report.missing.length > 0) {
        for (const f of report.missing) {
          console.log(`  ${error(f + '  MISSING')}`);
        }
      }
      if (report.untracked.length > 0) {
        for (const f of report.untracked) {
          console.log(`  ${colors.cyan('📄 UNTRACKED: ' + f)}`);
        }
      }

      console.log('');
      const parts = [
        colors.green(`${report.verified} verified`),
        report.tampered.length > 0 ? colors.yellow(`${report.tampered.length} tampered`) : colors.dim(`${report.tampered.length} tampered`),
        report.missing.length > 0 ? colors.red(`${report.missing.length} missing`) : colors.dim(`${report.missing.length} missing`),
      ];
      console.log(`  Results: ${parts.join(colors.dim(' | '))}`);
      console.log('');

      await deactivate();

      if (report.tampered.length > 0) process.exit(1);
    } catch (err: any) {
      console.error(error(err.message));
      process.exit(1);
    }
  });
