import { Command } from 'commander';
import { success, info, colors } from '../branding';

export const revokeCommand = new Command('revoke')
  .description('Revoke another agent\'s access to specific document types')
  .argument('<reader-address>', 'Address of the agent to revoke access from')
  .requiredOption('--docs <types>', 'Comma-separated document types (e.g. MEMORY,AGENTS)')
  .action(async (readerAddress: string, opts: { docs: string }) => {
    const docTypes = opts.docs.split(',').map(d => d.trim());
    info(`Revoking ${readerAddress} access to: ${docTypes.join(', ')}`);
    
    const { getEngine } = await import('../../openclaw/extension');
    const engine = getEngine();
    if (!engine) {
      console.error(colors.red('SoulChain not activated. Run `soulchain init` first.'));
      process.exit(1);
    }

    const chain = engine.getChain();
    const { SoulDocumentType } = await import('../../core/types/documents');
    
    const DOC_TYPE_MAP: Record<string, number> = {};
    Object.values(SoulDocumentType).forEach((v, i) => { DOC_TYPE_MAP[v] = i; });

    for (const docType of docTypes) {
      const docTypeId = DOC_TYPE_MAP[docType.toLowerCase()] ?? -1;
      if (docTypeId === -1) {
        console.error(colors.red(`Unknown document type: ${docType}`));
        continue;
      }
      await chain.revokeAccess(readerAddress, docTypeId);
      await chain.removeAccessKey(readerAddress, docTypeId);
      success(`Revoked ${docType} access`);
    }
    
    success('Access revoked successfully');
  });
