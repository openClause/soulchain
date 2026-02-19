#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const init_1 = require("./commands/init");
const status_1 = require("./commands/status");
const verify_1 = require("./commands/verify");
const restore_1 = require("./commands/restore");
const export_1 = require("./commands/export");
const import_1 = require("./commands/import");
const history_1 = require("./commands/history");
const branding_1 = require("./branding");
const program = new commander_1.Command();
program
    .name('soulchain')
    .description('SoulChain — sovereign identity anchored on-chain')
    .version('0.1.0', '-V, --version')
    .on('option:version', () => {
    (0, branding_1.printLogo)();
    process.exit(0);
});
program.addCommand(init_1.initCommand);
program.addCommand(status_1.statusCommand);
program.addCommand(verify_1.verifyCommand);
program.addCommand(restore_1.restoreCommand);
program.addCommand(export_1.exportCommand);
program.addCommand(import_1.importCommand);
program.addCommand(history_1.historyCommand);
program.parse();
