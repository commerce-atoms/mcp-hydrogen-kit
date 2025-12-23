import { resolve } from 'node:path';

/**
 * Application configuration.
 */
export type AppConfig = {
  /** Root directory for file operations (sandboxed) */
  rootDir: string;
  /** Optional path to GraphQL schema file */
  schemaPath?: string;
  /** Default routes file path */
  defaultRoutesFile: string;
};

/**
 * Load configuration from environment variables with defaults.
 */
export function loadConfig(): AppConfig {
  const rootDir = process.env.MCP_ROOT_DIR
    ? resolve(process.env.MCP_ROOT_DIR)
    : resolve(process.cwd());

  const schemaPath = process.env.MCP_SCHEMA_PATH
    ? resolve(process.env.MCP_SCHEMA_PATH)
    : undefined;

  return {
    rootDir,
    schemaPath,
    defaultRoutesFile: 'app/routes.ts',
  };
}

