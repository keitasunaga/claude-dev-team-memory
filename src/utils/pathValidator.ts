import path from 'node:path';
import { logger } from './logger.js';

export class PathValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PathValidationError';
  }
}

/**
 * Validates project path to prevent path traversal attacks
 */
export function validateProjectPath(projectPath: string): boolean {
  try {
    // Normalize the path
    const normalized = path.normalize(projectPath);
    
    // Check for path traversal attempts
    if (normalized.includes('..')) {
      logger.warn('Path traversal attempt detected', { path: projectPath });
      return false;
    }
    
    // Ensure it's an absolute path
    if (!path.isAbsolute(normalized)) {
      logger.warn('Non-absolute path provided', { path: projectPath });
      return false;
    }
    
    // Additional security checks
    const forbidden = ['/etc', '/sys', '/proc', '/dev', '/bin', '/sbin', '/usr/bin', '/usr/sbin'];
    const lowerPath = normalized.toLowerCase();
    
    for (const forbiddenPath of forbidden) {
      if (lowerPath.startsWith(forbiddenPath)) {
        logger.warn('Attempt to access forbidden path', { path: projectPath, forbidden: forbiddenPath });
        return false;
      }
    }
    
    return true;
  } catch (error) {
    logger.error('Error validating path', { path: projectPath, error });
    return false;
  }
}

/**
 * Validates and sanitizes a project path
 * @throws {PathValidationError} if path is invalid
 */
export function sanitizeProjectPath(projectPath: string): string {
  if (!validateProjectPath(projectPath)) {
    throw new PathValidationError(`Invalid project path: ${projectPath}`);
  }
  
  // Return normalized path
  return path.normalize(projectPath);
}

/**
 * Checks if a path is within allowed directories
 */
export function isPathAllowed(projectPath: string, allowedPaths: string[]): boolean {
  if (!validateProjectPath(projectPath)) {
    return false;
  }
  
  const normalized = path.normalize(projectPath);
  
  // If no allowed paths specified, allow all valid paths
  if (!allowedPaths || allowedPaths.length === 0) {
    return true;
  }
  
  // Check if path starts with any allowed path
  return allowedPaths.some(allowed => {
    const normalizedAllowed = path.normalize(allowed);
    return normalized.startsWith(normalizedAllowed);
  });
}

/**
 * Generates a safe filename from a project path
 */
export function generateSafeFilename(projectPath: string): string {
  // Create a hash of the path for consistent naming
  const crypto = require('crypto');
  const hash = crypto.createHash('md5').update(projectPath).digest('hex');
  
  // Take first 16 characters of hash
  return hash.substring(0, 16);
}