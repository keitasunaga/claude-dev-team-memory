import pino from 'pino';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

// Get logs directory from config or default
const getLogsDirectory = (): string => {
  const configLogsDir = process.env.MCP_MEMORY_LOGS_DIR;
  if (configLogsDir) {
    return configLogsDir;
  }

  // Default to user's home directory for MCP server logs
  return path.join(os.homedir(), '.mcp-memory-server', 'logs');
};

const logsDir = getLogsDirectory();

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create rotating file transport configuration
const createFileTransport = (level: string, filename: string) => ({
  target: 'pino/file',
  level,
  options: {
    destination: path.join(logsDir, filename),
    mkdir: true,
  },
});

// Create console transport for development
const createConsoleTransport = () => ({
  target: 'pino-pretty',
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  options: {
    colorize: true,
    translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
    ignore: 'pid,hostname',
    messageFormat: '{levelLabel} - {msg}',
  },
});

// Create logger with multiple transports
const createLogger = () => {
  const transports: any[] = [
    createFileTransport('info', 'mcp-memory-server.log'),
    createFileTransport('error', 'error.log'),
  ];

  // Add console transport for non-production environments
  if (process.env.NODE_ENV !== 'production') {
    transports.push(createConsoleTransport());
  }

  return pino({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
    timestamp: pino.stdTimeFunctions.isoTime,
    transport: {
      targets: transports,
    },
  });
};

export const logger = createLogger();

// Utility functions for structured logging
export const createContextLogger = (context: Record<string, any>) => {
  return logger.child(context);
};

export const createRequestLogger = (requestId: string) => {
  return logger.child({ requestId });
};

export const createToolLogger = (toolName: string) => {
  return logger.child({ tool: toolName });
};

// Performance logging utilities
export const logPerformance = (
  operation: string,
  duration: number,
  metadata?: Record<string, any>
) => {
  logger.info(
    {
      operation,
      duration,
      ...metadata,
    },
    `Performance: ${operation} completed in ${duration}ms`
  );
};

export const createPerformanceLogger = () => {
  const start = process.hrtime.bigint();

  return (operation: string, metadata?: Record<string, any>) => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    logPerformance(operation, duration, metadata);
  };
};

export default logger;
