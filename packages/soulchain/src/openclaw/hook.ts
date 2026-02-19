import * as fs from 'fs';
import * as path from 'path';

// Get the mutable CommonJS fs module for monkey-patching (import * creates frozen namespace)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mutableFs: any = require('fs');
import type { SyncEngine } from '../core/index';
import type { CacheManager } from './cache';

export class SoulchainHook {
  private engine: SyncEngine;
  private trackedPaths: Set<string>;
  private trackedRelative: Map<string, string>; // absolute → relative
  private workspaceDir: string;
  private installed = false;
  private cache: CacheManager | null = null;

  // In-flight chain fetches to avoid duplicate concurrent reads
  private pendingReads = new Map<string, Promise<Buffer>>();

  // Store originals — writes
  private originalWriteFileSync: typeof fs.writeFileSync = fs.writeFileSync;
  private originalWriteFile: typeof fs.writeFile = fs.writeFile;
  private originalPromisesWriteFile: typeof fs.promises.writeFile = fs.promises.writeFile;

  // Store originals — reads
  private originalReadFileSync: typeof fs.readFileSync = fs.readFileSync;
  private originalReadFile: typeof fs.readFile = fs.readFile;
  private originalPromisesReadFile: typeof fs.promises.readFile = fs.promises.readFile;

  // Store originals — existence/stat
  private originalExistsSync: typeof fs.existsSync = fs.existsSync;
  private originalAccessSync: typeof fs.accessSync = fs.accessSync;
  private originalAccess: typeof fs.access = fs.access;
  private originalStatSync: typeof fs.statSync = fs.statSync;
  private originalStat: typeof fs.stat = fs.stat;
  private originalPromisesAccess: typeof fs.promises.access = fs.promises.access;
  private originalPromisesStat: typeof fs.promises.stat = fs.promises.stat;

  constructor(engine: SyncEngine, workspaceDir: string, trackedPaths: string[]) {
    this.engine = engine;
    this.workspaceDir = path.resolve(workspaceDir);
    this.trackedRelative = new Map();
    this.trackedPaths = new Set();
    for (const p of trackedPaths) {
      const abs = path.resolve(workspaceDir, p);
      this.trackedPaths.add(abs);
      this.trackedRelative.set(abs, p);
    }
  }

  setCache(cache: CacheManager): void {
    this.cache = cache;
  }

  install(): void {
    if (this.installed) return;

    const self = this;
    const origWriteSync = this.originalWriteFileSync;
    const origWriteAsync = this.originalWriteFile;
    const origWritePromises = this.originalPromisesWriteFile;
    const origReadSync = this.originalReadFileSync;
    const origReadAsync = this.originalReadFile;
    const origReadPromises = this.originalPromisesReadFile;

    // ===== WRITE HOOKS =====

    mutableFs.writeFileSync = function patchedWriteFileSync(
      file: fs.PathOrFileDescriptor, data: any, options?: fs.WriteFileOptions
    ) {
      origWriteSync.call(fs, file, data, options);
      self.maybeInterceptWrite(file, data);
    };

    mutableFs.writeFile = function patchedWriteFile(
      file: fs.PathOrFileDescriptor, data: any, optionsOrCb: any, cb?: any
    ) {
      const callback = typeof optionsOrCb === 'function' ? optionsOrCb : cb;
      const options = typeof optionsOrCb === 'function' ? undefined : optionsOrCb;
      const args: any[] = [file, data];
      if (options) args.push(options);
      args.push((err: any) => {
        if (!err) self.maybeInterceptWrite(file, data);
        if (callback) callback(err);
      });
      (origWriteAsync as any).apply(fs, args);
    };

    mutableFs.promises.writeFile = async function patchedPromisesWriteFile(
      file: fs.PathLike | fs.promises.FileHandle, data: any, options?: any
    ) {
      await origWritePromises.call(fs.promises, file, data, options);
      self.maybeInterceptWrite(file, data);
    };

    // ===== READ HOOKS =====

    mutableFs.readFileSync = function patchedReadFileSync(
      file: fs.PathOrFileDescriptor, options?: any
    ): any {
      const result = self.maybeInterceptReadSync(file);
      if (result !== null) {
        // Return as string if encoding specified, Buffer otherwise
        if (options && (typeof options === 'string' || options?.encoding)) {
          const encoding = typeof options === 'string' ? options : options.encoding;
          return result.toString(encoding);
        }
        return result;
      }
      return origReadSync.call(fs, file, options);
    };

    mutableFs.readFile = function patchedReadFile(
      file: fs.PathOrFileDescriptor, optionsOrCb: any, cb?: any
    ) {
      const callback = typeof optionsOrCb === 'function' ? optionsOrCb : cb;
      const options = typeof optionsOrCb === 'function' ? undefined : optionsOrCb;

      self.maybeInterceptReadAsync(file).then(result => {
        if (result !== null) {
          if (options && (typeof options === 'string' || options?.encoding)) {
            const encoding = typeof options === 'string' ? options : options.encoding;
            callback(null, result.toString(encoding));
          } else {
            callback(null, result);
          }
        } else {
          const args: any[] = [file];
          if (options) args.push(options);
          args.push(callback);
          (origReadAsync as any).apply(fs, args);
        }
      }).catch(err => {
        // Chain fetch failed, fall back to local
        const args: any[] = [file];
        if (options) args.push(options);
        args.push(callback);
        (origReadAsync as any).apply(fs, args);
      });
    };

    mutableFs.promises.readFile = async function patchedPromisesReadFile(
      file: fs.PathLike | fs.promises.FileHandle, options?: any
    ): Promise<any> {
      const result = await self.maybeInterceptReadAsync(file as any);
      if (result !== null) {
        if (options && (typeof options === 'string' || options?.encoding)) {
          const encoding = typeof options === 'string' ? options : options.encoding;
          return result.toString(encoding);
        }
        return result;
      }
      return origReadPromises.call(fs.promises, file, options);
    };

    // ===== EXISTENCE / STAT HOOKS =====

    const origExistsSync = this.originalExistsSync;
    const origAccessSync = this.originalAccessSync;
    const origAccess = this.originalAccess;
    const origStatSync = this.originalStatSync;
    const origStat = this.originalStat;
    const origPromisesAccess = this.originalPromisesAccess;
    const origPromisesStat = this.originalPromisesStat;

    mutableFs.existsSync = function patchedExistsSync(p: fs.PathLike): boolean {
      const result = origExistsSync.call(fs, p);
      if (result) return true;
      // File doesn't exist on disk — check if tracked
      return self.isTrackedFile(p as any) !== null;
    };

    mutableFs.accessSync = function patchedAccessSync(p: fs.PathLike, mode?: number): void {
      try {
        return origAccessSync.call(fs, p, mode);
      } catch (err: any) {
        if (err?.code === 'ENOENT' && self.isTrackedFile(p as any) !== null) {
          return; // accessible via chain
        }
        throw err;
      }
    };

    mutableFs.access = function patchedAccess(p: fs.PathLike, ...args: any[]) {
      const callback = args[args.length - 1];
      const mode = args.length > 1 ? args[0] : undefined;
      const origArgs: any[] = [p];
      if (mode !== undefined) origArgs.push(mode);
      origArgs.push((err: any) => {
        if (err?.code === 'ENOENT' && self.isTrackedFile(p as any) !== null) {
          callback(null);
        } else {
          callback(err);
        }
      });
      (origAccess as any).apply(fs, origArgs);
    };

    mutableFs.statSync = function patchedStatSync(p: fs.PathLike, options?: any): any {
      try {
        return origStatSync.call(fs, p, options);
      } catch (err: any) {
        if (err?.code === 'ENOENT' && self.isTrackedFile(p as any) !== null) {
          return self.createFakeStat();
        }
        throw err;
      }
    };

    mutableFs.stat = function patchedStat(p: fs.PathLike, ...args: any[]) {
      const callback = args[args.length - 1];
      const options = args.length > 1 ? args[0] : undefined;
      const origArgs: any[] = [p];
      if (options && typeof options !== 'function') origArgs.push(options);
      origArgs.push((err: any, stats: any) => {
        if (err?.code === 'ENOENT' && self.isTrackedFile(p as any) !== null) {
          callback(null, self.createFakeStat());
        } else {
          callback(err, stats);
        }
      });
      (origStat as any).apply(fs, origArgs);
    };

    mutableFs.promises.access = async function patchedPromisesAccess(p: fs.PathLike, mode?: number): Promise<void> {
      try {
        return await origPromisesAccess.call(fs.promises, p, mode);
      } catch (err: any) {
        if (err?.code === 'ENOENT' && self.isTrackedFile(p as any) !== null) {
          return;
        }
        throw err;
      }
    };

    mutableFs.promises.stat = async function patchedPromisesStat(p: fs.PathLike, options?: any): Promise<any> {
      try {
        return await origPromisesStat.call(fs.promises, p, options);
      } catch (err: any) {
        if (err?.code === 'ENOENT' && self.isTrackedFile(p as any) !== null) {
          return self.createFakeStat();
        }
        throw err;
      }
    };

    this.installed = true;
  }

  private createFakeStat(): any {
    const now = new Date();
    return {
      isFile: () => true,
      isDirectory: () => false,
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isSymbolicLink: () => false,
      isFIFO: () => false,
      isSocket: () => false,
      dev: 0,
      ino: 0,
      mode: 0o100644,
      nlink: 1,
      uid: 1000,
      gid: 1000,
      rdev: 0,
      size: 1024,
      blksize: 4096,
      blocks: 8,
      atimeMs: now.getTime(),
      mtimeMs: now.getTime(),
      ctimeMs: now.getTime(),
      birthtimeMs: now.getTime(),
      atime: now,
      mtime: now,
      ctime: now,
      birthtime: now,
    };
  }

  uninstall(): void {
    if (!this.installed) return;
    mutableFs.writeFileSync = this.originalWriteFileSync;
    mutableFs.writeFile = this.originalWriteFile;
    mutableFs.promises.writeFile = this.originalPromisesWriteFile;
    mutableFs.readFileSync = this.originalReadFileSync;
    mutableFs.readFile = this.originalReadFile;
    mutableFs.promises.readFile = this.originalPromisesReadFile;
    mutableFs.existsSync = this.originalExistsSync;
    mutableFs.accessSync = this.originalAccessSync;
    mutableFs.access = this.originalAccess;
    mutableFs.statSync = this.originalStatSync;
    mutableFs.stat = this.originalStat;
    mutableFs.promises.access = this.originalPromisesAccess;
    mutableFs.promises.stat = this.originalPromisesStat;
    this.installed = false;
  }

  // ===== WRITE INTERCEPTION =====

  private maybeInterceptWrite(file: fs.PathOrFileDescriptor | fs.PathLike | fs.promises.FileHandle, data: any): void {
    if (typeof file !== 'string') return;
    const resolved = path.resolve(this.workspaceDir, file);
    if (!this.trackedPaths.has(resolved)) return;
    const relativePath = this.trackedRelative.get(resolved)!;
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data));

    // Update flat cache for preload early hooks
    try {
      const cacheDir = path.join(this.workspaceDir, '.soulchain', 'cache');
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
      this.originalWriteFileSync.call(fs, path.join(cacheDir, relativePath.replace(/\//g, '__')), buf);
    } catch { /* best effort */ }

    // Fire and forget — sync to chain + update cache
    this.engine.onFileWrite(relativePath, buf).then(() => {
      if (this.cache) {
        // Get chain hash after write
        const { sha256: sha256Hash } = require('../core/utils/hash');
        const hash = sha256Hash(buf);
        this.engine.getLatestVersion(relativePath).then(version => {
          this.cache!.update(relativePath, hash, version);
        }).catch(() => {});
      }
    }).catch(err => {
      console.error(`[soulchain] sync error for ${relativePath}:`, err.message);
    });
  }

  // ===== READ INTERCEPTION =====

  private isTrackedFile(file: any): string | null {
    if (typeof file !== 'string') return null;
    const resolved = path.resolve(this.workspaceDir, file);
    return this.trackedRelative.get(resolved) ?? null;
  }

  /**
   * Sync read interception. If file is tracked:
   * 1. Check cache freshness
   * 2. If fresh, return null (use original readFileSync)
   * 3. If stale/missing, fetch from chain synchronously (blocking)
   */
  maybeInterceptReadSync(file: any): Buffer | null {
    const relativePath = this.isTrackedFile(file);
    if (!relativePath) return null;

    const resolved = path.resolve(this.workspaceDir, file as string);

    // Check if local cache is fresh
    if (this.cache && this.isLocalCacheFresh(relativePath, resolved)) {
      return null; // let original readFileSync handle it
    }

    // Need to fetch from chain — but restoreFile is async
    // For sync read, we check if local file exists and return it even if potentially stale
    // The async path will update it. For true blockchain-native, we do a blocking fetch.
    try {
      // Use a synchronous approach: check if file exists locally
      if (fs.existsSync(resolved)) {
        // File exists — return it (might be slightly stale but avoids blocking)
        // Schedule async refresh
        this.refreshFromChain(relativePath, resolved).catch(() => {});
        return null; // let original handle it
      }

      // File missing locally — must fetch from chain (blocking via sync workaround)
      // We use execSync to call ourselves in a child process... no, that's terrible.
      // Instead, throw a meaningful error and let the async path handle it
      // OR: pre-populate on activate (which we do), so this shouldn't happen often
      console.warn(`[soulchain] ${relativePath} not in local cache, chain fetch needed (use async read)`);
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Async read interception. Returns Buffer if intercepted, null otherwise.
   */
  async maybeInterceptReadAsync(file: any): Promise<Buffer | null> {
    const relativePath = this.isTrackedFile(file);
    if (!relativePath) return null;

    const resolved = path.resolve(this.workspaceDir, file as string);

    // Check if local cache is fresh
    if (this.cache && this.isLocalCacheFresh(relativePath, resolved)) {
      return null; // let original read handle it
    }

    // Fetch from chain
    try {
      const content = await this.fetchFromChain(relativePath, resolved);
      return content;
    } catch {
      // Chain fetch failed — fall back to local
      return null;
    }
  }

  private isLocalCacheFresh(relativePath: string, absolutePath: string): boolean {
    if (!this.cache) return false;
    const entry = this.cache.get(relativePath);
    if (!entry) return false;

    // Check if local file exists and hash matches
    try {
      if (!fs.existsSync(absolutePath)) return false;
      const { sha256: sha256Hash } = require('../core/utils/hash');
      const content = this.originalReadFileSync.call(fs, absolutePath) as Buffer;
      const localHash = sha256Hash(content);
      return localHash === entry.chainHash;
    } catch {
      return false;
    }
  }

  private async fetchFromChain(relativePath: string, absolutePath: string): Promise<Buffer> {
    // Deduplicate concurrent fetches
    const existing = this.pendingReads.get(relativePath);
    if (existing) return existing;

    const promise = this.engine.restoreFile(relativePath).then(content => {
      // Write to local cache
      const dir = path.dirname(absolutePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      this.originalWriteFileSync.call(fs, absolutePath, content);

      // Update cache metadata
      if (this.cache) {
        const { sha256: sha256Hash } = require('../core/utils/hash');
        const hash = sha256Hash(content);
        this.engine.getLatestVersion(relativePath).then(version => {
          this.cache!.update(relativePath, hash, version);
        }).catch(() => {});
      }

      this.pendingReads.delete(relativePath);
      return content;
    }).catch(err => {
      this.pendingReads.delete(relativePath);
      throw err;
    });

    this.pendingReads.set(relativePath, promise);
    return promise;
  }

  private async refreshFromChain(relativePath: string, absolutePath: string): Promise<void> {
    try {
      await this.fetchFromChain(relativePath, absolutePath);
    } catch {
      // silent — best effort refresh
    }
  }
}
