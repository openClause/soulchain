import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { activate, getEngine, deactivate } from '../../openclaw/index';
import { success, error, info, colors } from '../branding';

export const restoreCommand = new Command('restore')
  .description('Restore file(s) from chain')
  .argument('[path]', 'specific file to restore')
  .option('-v, --version <version>', 'specific version number', parseInt)
  .option('-y, --yes', 'skip confirmation')
  .action(async (filePath?: string, opts?: { version?: number; yes?: boolean }) => {
    const workspaceDir = process.cwd();

    try {
      await activate(workspaceDir);
      const engine = getEngine();
      if (!engine) {
        console.error(error('Failed to initialize engine'));
        process.exit(1);
      }

      console.log(info('Restoring from chain...'));
      console.log('');

      if (filePath) {
        const versionStr = opts?.version !== undefined ? ` → v${opts.version}` : '';
        process.stdout.write(`  ↻ ${colors.cyan(filePath)}${colors.dim(versionStr)} ... `);
        const content = await engine.restoreFile(filePath, opts?.version);
        const fullPath = path.resolve(workspaceDir, filePath);
        fs.writeFileSync(fullPath, content);
        console.log(colors.green('✅ restored'));
      } else {
        const report = await engine.verifyIntegrity();
        if (report.tampered.length === 0 && report.missing.length === 0) {
          console.log(success('All files are intact. Nothing to restore.'));
          await deactivate();
          return;
        }

        const toRestore = [...report.tampered, ...report.missing];
        for (const f of toRestore) {
          try {
            process.stdout.write(`  ↻ ${colors.cyan(f)} ... `);
            const content = await engine.restoreFile(f);
            fs.writeFileSync(path.resolve(workspaceDir, f), content);
            console.log(colors.green('✅ restored'));
          } catch (err: any) {
            console.log(colors.red(`❌ ${err.message}`));
          }
        }

        console.log('');
        console.log(success(`${toRestore.length} file(s) restored from chain.`));
      }

      console.log('');
      await deactivate();
    } catch (err: any) {
      console.error(error(err.message));
      process.exit(1);
    }
  });
