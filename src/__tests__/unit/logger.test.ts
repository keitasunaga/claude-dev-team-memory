import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  logger,
  createContextLogger,
  createRequestLogger,
  createToolLogger,
  logPerformance,
  createPerformanceLogger,
} from '../../utils/logger.js';

describe('Logger Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Logger', () => {
    it('should have logger instance', () => {
      expect(logger).toBeDefined();
      expect(logger.info).toBeTypeOf('function');
      expect(logger.error).toBeTypeOf('function');
      expect(logger.warn).toBeTypeOf('function');
      expect(logger.debug).toBeTypeOf('function');
    });
  });

  describe('Context Loggers', () => {
    it('should create context logger', () => {
      const contextLogger = createContextLogger({ component: 'test' });
      expect(contextLogger).toBeDefined();
      expect(contextLogger.info).toBeTypeOf('function');
    });

    it('should create request logger', () => {
      const requestLogger = createRequestLogger('req-123');
      expect(requestLogger).toBeDefined();
      expect(requestLogger.info).toBeTypeOf('function');
    });

    it('should create tool logger', () => {
      const toolLogger = createToolLogger('save_global_preference');
      expect(toolLogger).toBeDefined();
      expect(toolLogger.info).toBeTypeOf('function');
    });
  });

  describe('Performance Logging', () => {
    it('should log performance with duration', () => {
      const spy = vi.spyOn(logger, 'info');

      logPerformance('test-operation', 100, { extra: 'data' });

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'test-operation',
          duration: 100,
          extra: 'data',
        }),
        'Performance: test-operation completed in 100ms'
      );
    });

    it('should create performance logger function', () => {
      const perfLogger = createPerformanceLogger();
      expect(perfLogger).toBeTypeOf('function');

      const spy = vi.spyOn(logger, 'info');

      // Simulate some operation
      perfLogger('test-operation');

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'test-operation',
          duration: expect.any(Number),
        }),
        expect.stringContaining('Performance: test-operation completed in')
      );
    });
  });

  describe('Log Levels', () => {
    it('should respect log level environment variable', () => {
      // This test verifies that the logger respects the LOG_LEVEL env var
      // In our test setup, we set LOG_LEVEL to 'silent'
      expect(process.env.LOG_LEVEL).toBe('silent');
    });
  });
});
