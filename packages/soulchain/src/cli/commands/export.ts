import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig, sha256 } from '../../core/index';
import { success, error, info, colors } from '../branding';

export const exportCommand = new Command('export')
  .description('Export entire soul as encrypted bundle')
  .option('-o, --output <file>', 'output file', 'soul.soulchain-bundle')
  .action((opts) => {
    const workspaceDir = process.cwd();

    try {
      const config = loadConfig(workspaceDir);

      console.log(info('Exporting soul...'));
      console.log('');

      const bundle: Record<string, any> = {
        version: 1,
        timestamp: new Date().toISOString(),
        chain: config.chain,
        storage: config.storage,
        files: {} as Record<string, { content: string; hash: string }>,
      };

      for (const tracked of config.trackedPaths) {
        const fullPath = path.resolve(workspaceDir, tracked);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          bundle.files[tracked] = {
            content: Buffer.from(content).toString('base64'),
            hash: sha256(Buffer.from(content)),
          };
          console.log(`  ${colors.dim('▸')} ${colors.cyan(tracked)}`);
        }
      }

      const keystorePath = path.resolve(workspaceDir, config.keystorePath);
      if (fs.existsSync(keystorePath)) {
        bundle.keystore = JSON.parse(fs.readFileSync(keystorePath, 'utf-8'));
        console.log(`  ${colors.dim('▸')} ${colors.cyan('keystore')} 🔐`);
      }

      const outPath = path.resolve(workspaceDir, opts.output);
      fs.writeFileSync(outPath, JSON.stringify(bundle, null, 2));

      console.log('');
      console.log(success(`Exported ${Object.keys(bundle.files).length} files to ${colors.cyan(opts.output)}`));
      console.log('');
    } catch (err: any) {
      console.error(error(err.message));
      process.exit(1);
    }
  });
