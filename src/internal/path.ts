import { posix } from 'node:path';

/**
 * Normalize a path to POSIX format and resolve any relative components.
 * Does not resolve absolute paths or check for existence.
 */
export function normalizePath(path: string): string {
  return posix.normalize(path.replace(/\\/g, '/'));
}

/**
 * Check if a path contains any parent directory references.
 */
export function hasParentRef(path: string): boolean {
  const normalized = normalizePath(path);
  return normalized.includes('../') || normalized.startsWith('../');
}

