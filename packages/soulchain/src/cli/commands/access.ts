import { Command } from 'commander';
import { success, info, colors } from '../branding';

export const accessCommand = new Command('access')
  .description('Manage access grants');

accessCommand
  .command('list')
  .description('List all access grants, children, and parent')
  .action(async () => {
    const { getEngine } = await import('../../openclaw/extension');
    const engine = getEngine();
    if (!engine) {
      console.error(colors.red('SoulChain not activated. Run `soulchain init` first.'));
      process.exit(1);
    }

    const accessMap = await engine.listAccess();
    
    console.log('\n' + colors.bold('📋 Access Map'));
    console.log('─'.repeat(40));
    
    if (accessMap.parent) {
      console.log(`${colors.cyan('Parent:')} ${accessMap.parent}`);
    } else {
      console.log(`${colors.cyan('Parent:')} none`);
    }
    
    if (accessMap.children.length > 0) {
      console.log(`${colors.cyan('Children:')}`);
      for (const child of accessMap.children) {
        console.log(`  → ${child}`);
      }
    } else {
      console.log(`${colors.cyan('Children:')} none`);
    }
    
    if (accessMap.grants.length > 0) {
      console.log(`${colors.cyan('Grants:')}`);
      for (const grant of accessMap.grants) {
        console.log(`  → ${grant.readerAddress}: docTypes [${grant.docTypes.join(', ')}]`);
      }
    } else {
      console.log(`${colors.cyan('Grants:')} (query chain events for full list)`);
    }
    
    console.log('');
  });
