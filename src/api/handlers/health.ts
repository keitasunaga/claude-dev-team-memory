import type { DatabaseManager } from '../../db/DatabaseManager.js';
import { logger } from '../../utils/logger.js';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    database: {
      status: 'healthy' | 'unhealthy';
      message?: string;
    };
    memory: {
      heapUsed: number;
      heapTotal: number;
      external: number;
      rss: number;
    };
  };
}

export function createHealthHandler(dbManager: DatabaseManager) {
  return async (): Promise<{ data: HealthStatus }> => {
    const startTime = Date.now();
    
    try {
      // Check database connectivity
      const dbStatus = await checkDatabaseHealth(dbManager);
      
      // Get memory usage
      const memoryUsage = process.memoryUsage();
      
      const status: HealthStatus = {
        status: dbStatus.status === 'healthy' ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        checks: {
          database: dbStatus,
          memory: {
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
            external: Math.round(memoryUsage.external / 1024 / 1024), // MB
            rss: Math.round(memoryUsage.rss / 1024 / 1024) // MB
          }
        }
      };
      
      const responseTime = Date.now() - startTime;
      logger.debug('Health check completed', { responseTime, status: status.status });
      
      return { data: status };
    } catch (error) {
      logger.error('Health check failed', error);
      
      return {
        data: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          version: process.env.npm_package_version || '1.0.0',
          checks: {
            database: {
              status: 'unhealthy',
              message: error instanceof Error ? error.message : 'Unknown error'
            },
            memory: {
              heapUsed: 0,
              heapTotal: 0,
              external: 0,
              rss: 0
            }
          }
        }
      };
    }
  };
}

async function checkDatabaseHealth(dbManager: DatabaseManager): Promise<{ status: 'healthy' | 'unhealthy'; message?: string }> {
  try {
    // Try to get the global database
    const db = dbManager.getGlobalDb();
    
    // Run a simple query to check connectivity
    const result = await new Promise<any>((resolve, reject) => {
      db.get('SELECT 1 as test', (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (result && result.test === 1) {
      return { status: 'healthy' };
    } else {
      return { status: 'unhealthy', message: 'Unexpected query result' };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Database check failed'
    };
  }
}