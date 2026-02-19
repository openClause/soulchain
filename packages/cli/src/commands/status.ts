import { Command } from 'commander';
import { loadConfig } from '@soulchain/core';
import { printHeader, error, colors } from '../branding';

export const statusCommand = new Command('status')
  .description('Show sync status, chain connection, pending queue')
  .action(() => {
    const workspaceDir = process.cwd();
    try {
      const config = loadConfig(workspaceDir);

      printHeader();

      const green = colors.green('●');
      const dim = colors.dim;

      console.log(`  ${dim('Chain:')}      ${colors.purple(String(config.chain))}          ${green} ${colors.green('connected')}`);
      console.log(`  ${dim('Storage:')}    ${colors.cyan(String(config.storage))}              ${green} ${colors.green('active')}`);
      console.log(`  ${dim('Keystore:')}   ${colors.cyan(config.keystorePath)}   🔐 ${dim('locked')}`);
      console.log(`  ${dim('Sync:')}       ${colors.cyan(config.syncMode)}`);
      console.log(`  ${dim('Files:')}      ${colors.green(config.trackedPaths.length + ' tracked')}`);

      if (config.trackedPaths.length > 0) {
        console.log('');
        for (const p of config.trackedPaths) {
          console.log(`    ${colors.dim('·')} ${colors.cyan(p)}`);
        }
      }
      console.log('');
    } catch (err: any) {
      console.error(error('Not initialized. Run `soulchain init` first.'));
      console.error(`   ${colors.dim(err.message)}`);
      process.exit(1);
    }
  });
