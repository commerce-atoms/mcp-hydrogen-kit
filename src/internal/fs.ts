import { readFile, stat, access } from 'node:fs/promises';
import { resolveInRoot } from './sandbox.js';

/**
 * Read a text file within the root directory.
 */
export async function readTextFile(
  rootDir: string,
  filePath: string
): Promise<string> {
  const resolved = resolveInRoot(rootDir, filePath);
  return await readFile(resolved, 'utf-8');
}

/**
 * Check if a file exists within the root directory.
 */
export async function fileExists(
  rootDir: string,
  filePath: string
): Promise<boolean> {
  try {
    const resolved = resolveInRoot(rootDir, filePath);
    await access(resolved);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file stats within the root directory.
 */
export async function getFileStats(
  rootDir: string,
  filePath: string
): Promise<{ mtime: Date; size: number }> {
  const resolved = resolveInRoot(rootDir, filePath);
  const stats = await stat(resolved);
  return {
    mtime: stats.mtime,
    size: stats.size,
  };
}

