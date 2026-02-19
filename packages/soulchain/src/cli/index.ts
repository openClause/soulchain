#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init';
import { statusCommand } from './commands/status';
import { verifyCommand } from './commands/verify';
import { restoreCommand } from './commands/restore';
import { exportCommand } from './commands/export';
import { importCommand } from './commands/import';
import { historyCommand } from './commands/history';
import { grantCommand } from './commands/grant';
import { revokeCommand } from './commands/revoke';
import { accessCommand } from './commands/access';
import { registerChildCommand } from './commands/register-child';
import { readSharedCommand } from './commands/read-shared';
import { printLogo } from './branding';

const program = new Command();

program
  .name('soulchain')
  .description('SoulChain — sovereign identity anchored on-chain')
  .version('0.1.0', '-V, --version')
  .on('option:version', () => {
    printLogo();
    process.exit(0);
  });

program.addCommand(initCommand);
program.addCommand(statusCommand);
program.addCommand(verifyCommand);
program.addCommand(restoreCommand);
program.addCommand(exportCommand);
program.addCommand(importCommand);
program.addCommand(historyCommand);
program.addCommand(grantCommand);
program.addCommand(revokeCommand);
program.addCommand(accessCommand);
program.addCommand(registerChildCommand);
program.addCommand(readSharedCommand);

program.parse();
