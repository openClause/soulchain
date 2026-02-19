import { Command } from 'commander';
import { loadConfig, MockChainProvider } from '../../core/index';
import { info, colors } from '../branding';

export const historyCommand = new Command('history')
  .description('Show version history for a file')
  .argument('[path]', 'file to show history for', 'SOUL.md')
  .action(async (filePath: string) => {
    const workspaceDir = process.cwd();

    try {
      const config = loadConfig(workspaceDir);
      const chain = new MockChainProvider();

      const lower = filePath.toLowerCase();
      let docType = 0;
      if (lower.includes('memory')) docType = 1;
      else if (lower.includes('agents')) docType = 2;
      else if (lower.includes('user')) docType = 3;

      const count = await chain.documentCount(docType);

      if (count === 0) {
        console.log(colors.dim(`No history found for ${filePath}`));
        return;
      }

      console.log(info(`Version history: ${filePath}`));
      console.log('');

      for (let v = 0; v < count; v++) {
        const doc = await chain.documentAt(docType, v);
        if (doc) {
          const date = new Date(doc.timestamp).toISOString().slice(0, 16).replace('T', ' ');
          const isLatest = v === count - 1;
          const vStr = `v${doc.version}`.padEnd(5);
          const hashStr = doc.contentHash.slice(0, 16) + '...';

          if (isLatest) {
            console.log(`  ${colors.green(vStr)} ${colors.dim(date)}  ${colors.dim('hash:')} ${colors.cyan(hashStr)}  ${colors.dim('cid:')} ${colors.cyan(doc.cid)}`);
          } else {
            console.log(`  ${colors.dim(vStr)} ${colors.dim(date)}  ${colors.dim('hash:')} ${colors.dim(hashStr)}  ${colors.dim('cid:')} ${colors.dim(doc.cid)}`);
          }
        }
      }
      console.log('');
    } catch (err: any) {
      console.error(colors.red(`❌ ${err.message}`));
      process.exit(1);
    }
  });
