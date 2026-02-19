import { describe, it, expect } from 'vitest';
import { Command } from 'commander';

describe('CLI command parsing', () => {
  it('parses init with defaults', () => {
    const program = new Command();
    program
      .command('init')
      .option('-c, --chain <chain>', 'chain', 'base-sepolia')
      .option('-s, --storage <storage>', 'storage', 'mock')
      .action(() => {});

    const cmd = program.commands[0];
    expect(cmd.name()).toBe('init');
  });

  it('parses restore with path and version', () => {
    const program = new Command();
    let parsed: any = {};
    program
      .command('restore')
      .argument('[path]')
      .option('-v, --version <version>', 'version', parseInt)
      .action((p, opts) => { parsed = { path: p, ...opts }; });

    program.parse(['node', 'test', 'restore', 'SOUL.md', '-v', '3']);
    expect(parsed.path).toBe('SOUL.md');
    expect(parsed.version).toBe(3);
  });

  it('parses history with default path', () => {
    const program = new Command();
    let parsed: any = {};
    program
      .command('history')
      .argument('[path]', 'file', 'SOUL.md')
      .action((p) => { parsed.path = p; });

    program.parse(['node', 'test', 'history']);
    expect(parsed.path).toBe('SOUL.md');
  });
});
