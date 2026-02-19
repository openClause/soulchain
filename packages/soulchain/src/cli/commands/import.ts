import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { success, error, info, colors } from '../branding';

export const importCommand = new Command('import')
  .description('Import soul bundle into workspace')
  .argument('<file>', 'bundle file to import')
  .option('-y, --yes', 'skip confirmation')
  .action((file: string, _opts: { yes?: boolean }) => {
    const workspaceDir = process.cwd();

    try {
      const bundlePath = path.resolve(file);
      if (!fs.existsSync(bundlePath)) {
        console.error(error(`File not found: ${file}`));
        process.exit(1);
      }

      console.log(info('Importing soul bundle...'));
      console.log('');

      const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf-8'));

      if (bundle.version !== 1) {
        console.error(error(`Unsupported bundle version: ${bundle.version}`));
        process.exit(1);
      }

      let count = 0;
      for (const [filePath, data] of Object.entries(bundle.files as Record<string, any>)) {
        const fullPath = path.resolve(workspaceDir, filePath);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        const content = Buffer.from(data.content, 'base64');
        fs.writeFileSync(fullPath, content);
        console.log(`  ${colors.dim('▸')} ${colors.cyan(filePath)}`);
        count++;
      }

      if (bundle.keystore) {
        const keystoreDir = path.join(workspaceDir, '.soulchain');
        if (!fs.existsSync(keystoreDir)) {
          fs.mkdirSync(keystoreDir, { recursive: true });
        }
        fs.writeFileSync(
          path.join(keystoreDir, 'keystore.json'),
          JSON.stringify(bundle.keystore, null, 2)
        );
        console.log(`  ${colors.dim('▸')} ${colors.cyan('keystore')} 🔐`);
      }

      console.log('');
      console.log(success(`Imported ${count} files from bundle.`));
      console.log('');
    } catch (err: any) {
      console.error(error(err.message));
      process.exit(1);
    }
  });
