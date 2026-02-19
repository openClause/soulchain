/**
 * Preload module for OpenClaw gateway integration.
 * Usage: NODE_OPTIONS="--require @openclaused/soulchain/preload" openclaw gateway start
 *
 * This installs soulchain's fs hooks BEFORE OpenClaw reads any workspace files.
 * 
 * Two-phase activation:
 *   Phase 1 (synchronous): Install fs read hooks that serve cached content for tracked files
 *   Phase 2 (async): Connect to chain, restore latest versions, install full write hooks
 */

import * as fs from 'fs';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mutableFs: any = require('fs');

// Find workspace dir
const home = process.env.HOME || process.env.USERPROFILE || '/root';
const workspaceCandidates = [
  process.env.SOULCHAIN_WORKSPACE,
  process.env.OPENCLAW_WORKSPACE,
  path.join(home, '.openclaw', 'workspace'),
  process.cwd(),
];

/**
 * Phase 1: Synchronous hook installation.
 * Reads config + cache metadata, patches fs.readFileSync/existsSync so that
 * tracked files missing from disk are served from .soulchain/cache/.
 * Returns the workspace dir if successful, null otherwise.
 */
function installEarlyHooks(): string | null {
  for (const dir of workspaceCandidates) {
    if (!dir) continue;
    const configPath = path.join(dir, 'soulchain.config.json');
    if (!fs.existsSync(configPath)) continue;

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const trackedPaths: string[] = config.trackedPaths || [];
      if (trackedPaths.length === 0) return dir;

      const cacheDir = path.join(dir, '.soulchain', 'cache');
      const trackedAbsolute = new Map<string, string>(); // abs path → relative path
      for (const rel of trackedPaths) {
        trackedAbsolute.set(path.resolve(dir, rel), rel);
      }

      // Save originals
      const origReadFileSync = fs.readFileSync;
      const origExistsSync = fs.existsSync;
      const origStatSync = fs.statSync;
      const origAccessSync = fs.accessSync;

      // Helper: get cached content for a tracked file
      function getCached(absPath: string): Buffer | null {
        const rel = trackedAbsolute.get(absPath);
        if (!rel) return null;
        const cachePath = path.join(cacheDir, rel.replace(/\//g, '__'));
        try {
          return origReadFileSync.call(fs, cachePath) as Buffer;
        } catch {
          return null;
        }
      }

      // Patch readFileSync: if tracked file missing from disk, serve from cache
      mutableFs.readFileSync = function patchedReadFileSync(
        file: fs.PathOrFileDescriptor, options?: any
      ): any {
        if (typeof file === 'string' || (file && typeof file === 'object' && 'toString' in file)) {
          const absPath = path.resolve(String(file));
          if (trackedAbsolute.has(absPath)) {
            try {
              return origReadFileSync.call(fs, file, options);
            } catch (e: any) {
              if (e.code === 'ENOENT') {
                const cached = getCached(absPath);
                if (cached) {
                  // Serve from cache
                  if (options === 'utf-8' || options === 'utf8' ||
                      (options && typeof options === 'object' && 
                       (options.encoding === 'utf-8' || options.encoding === 'utf8'))) {
                    return cached.toString('utf-8');
                  }
                  return cached;
                }
              }
              throw e;
            }
          }
        }
        return origReadFileSync.call(fs, file, options);
      };

      // Patch existsSync: tracked files with cache entries "exist"
      mutableFs.existsSync = function patchedExistsSync(p: fs.PathLike): boolean {
        const result = origExistsSync.call(fs, p);
        if (result) return true;
        const absPath = path.resolve(String(p));
        if (trackedAbsolute.has(absPath) && getCached(absPath)) {
          return true;
        }
        return false;
      };

      console.log(`[soulchain] Phase 1: Early hooks installed (${trackedPaths.length} tracked files, workspace: ${dir})`);
      return dir;
    } catch (e: any) {
      console.error(`[soulchain] Phase 1 failed: ${e.message}`);
      return null;
    }
  }
  return null;
}

// Phase 1: synchronous
const workspaceDir = installEarlyHooks();

// Phase 2: async — full chain connection + restore + write hooks
if (workspaceDir) {
  // Dynamic import to avoid loading heavy deps synchronously
  import('./openclaw/extension').then(({ activate }) => {
    return activate(workspaceDir);
  }).then(() => {
    console.log(`[soulchain] ✅ Preload fully activated (workspace: ${workspaceDir})`);
  }).catch((err: any) => {
    console.error(`[soulchain] ❌ Phase 2 (chain connect) failed: ${err.message}`);
    console.error('[soulchain] Early read hooks are still active (serving from cache)');
  });
}
