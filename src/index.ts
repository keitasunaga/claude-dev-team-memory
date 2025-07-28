#!/usr/bin/env node

import { MCPMemoryServer } from './server/MCPMemoryServer.js';
import { loadConfig } from './utils/config.js';
import { logger } from './utils/logger.js';
import process from 'node:process';

async function main() {
  try {
    logger.info('Starting MCP Memory Server...');

    // Load configuration
    const config = await loadConfig();

    // Create and start server
    const server = new MCPMemoryServer(config);
    await server.start();

    logger.info('MCP Memory Server started successfully');

    // Graceful shutdown handling
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      await server.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      await server.stop();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start MCP Memory Server', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { MCPMemoryServer } from './server/MCPMemoryServer.js';
export * from './types/index.js';
