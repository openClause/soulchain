import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { initSoulchain } from '../src/init';

describe('initSoulchain', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soulchain-init-'));
    // Create a SOUL.md for migration
    fs.writeFileSync(path.join(tmpDir, 'SOUL.md'), '# My Soul');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates keystore and config', async () => {
    const result = await initSoulchain(tmpDir, {
      chain: 'localhost',
      storage: 'mock',
      passphrase: 'test-pass',
    });

    expect(result.publicKey).toBeTruthy();
    expect(result.address).toBeTruthy();
    expect(fs.existsSync(result.keystorePath)).toBe(true);
    expect(fs.existsSync(result.configPath)).toBe(true);
  });

  it('registers soul and returns tx', async () => {
    const result = await initSoulchain(tmpDir, {
      chain: 'localhost',
      storage: 'mock',
      passphrase: 'test-pass',
    });

    expect(result.registrationTx).toMatch(/^0x/);
  });

  it('migrates existing files', async () => {
    const result = await initSoulchain(tmpDir, {
      chain: 'localhost',
      storage: 'mock',
      passphrase: 'test-pass',
      autoMigrate: true,
    });

    expect(result.migration).toBeDefined();
    expect(result.migration!.filesFound).toBeGreaterThanOrEqual(1);
    expect(result.migration!.filesUploaded).toBeGreaterThanOrEqual(1);
  });
});
