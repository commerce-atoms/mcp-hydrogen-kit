import { loadConfig } from './config.js';
import { startServer } from './server.js';

async function main() {
  const config = loadConfig();
  await startServer(config);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

