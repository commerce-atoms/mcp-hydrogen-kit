import { resolve, isAbsolute, sep, basename } from "node:path";
import { realpathSync } from "node:fs";
import { hasParentRef } from "./path.js";

/**
 * Resolve a target path within a root directory, ensuring it stays within bounds.
 * Rejects paths that escape via `..` or symlinks.
 *
 * Security: Uses realpath() on both root and target to prevent symlink escapes.
 * All file operations must use the returned absolute path, not the input.
 *
 * @param rootDir - Absolute path to the root directory
 * @param targetPath - Relative or absolute path to resolve
 * @returns Absolute realpath if valid, throws if escapes
 */
export function resolveInRoot(rootDir: string, targetPath: string): string {
  if (!isAbsolute(rootDir)) {
    throw new Error(`rootDir must be absolute, got: ${rootDir}`);
  }

  const rootReal = realpathSync(rootDir);

  let resolved: string;
  if (isAbsolute(targetPath)) {
    resolved = resolve(targetPath);
  } else {
    resolved = resolve(rootReal, targetPath);
  }

  // Check for parent directory escapes before resolving symlinks
  if (hasParentRef(resolved.replace(rootReal, ""))) {
    throw new Error(
      `Path escapes root directory: ${targetPath} (resolved to ${resolved})`
    );
  }

  // Resolve symlinks in target path
  // For non-existing files, resolve the parent directory and join basename
  let targetReal: string;
  try {
    targetReal = realpathSync(resolved);
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "ENOENT") {
      try {
        const parentDir = resolve(resolved, "..");
        const parentReal = realpathSync(parentDir);
        const rootRealWithSep = rootReal + sep;
        if (
          !parentReal.startsWith(rootRealWithSep) &&
          parentReal !== rootReal
        ) {
          throw new Error(
            `Path escapes root directory via symlink in parent: ${targetPath} (parent: ${parentReal})`
          );
        }
        // Return path with resolved parent + basename (no unresolved symlink components)
        targetReal = resolve(parentReal, basename(resolved));
      } catch {
        // Directory doesn't exist, but we've checked for ../ escapes
        return resolved;
      }
    } else {
      throw error;
    }
  }

  // Verify targetReal is within rootReal using path separator
  const rootRealWithSep = rootReal + sep;
  if (!targetReal.startsWith(rootRealWithSep) && targetReal !== rootReal) {
    throw new Error(
      `Path escapes root directory via symlink: ${targetPath} (resolved to ${targetReal}, root: ${rootReal})`
    );
  }

  return targetReal;
}
