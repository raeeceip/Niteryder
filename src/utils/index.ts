import { CronJob } from 'cron';
import { execSync } from 'child_process';
import winston from 'winston';
import fs from 'fs';
import path from 'path';

// Enhanced logger setup
export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'ferb-service' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Improved error handling utility
export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Retry utility with exponential backoff
export async function retry<T>(
  operation: () => Promise<T>,
  retries = 3,
  delay = 1000,
  factor = 2
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries > 0) {
      logger.warn(`Operation failed, retrying in ${delay}ms...`, { error });
      await new Promise(resolve => setTimeout(resolve, delay));
      return retry(operation, retries - 1, delay * factor, factor);
    } else {
      logger.error('Operation failed after all retries', { error });
      throw error;
    }
  }
}

// Improved cron job utility
export function createCronJob(cronTime: string, onTick: () => void): CronJob {
  const job = new CronJob(cronTime, async () => {
    try {
      await onTick();
    } catch (error) {
      logger.error('Error in cron job execution', { error });
    }
  });
  job.start();
  return job;
}

// Harper installation check
export function checkHarperInstallation(): boolean {
  try {
    execSync('harper-cli --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    logger.error('Harper CLI is not installed or not in PATH', { error });
    return false;
  }
}

// Safe file operations
export function safeWriteFile(filePath: string, content: string): void {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf8');
  } catch (error) {
    logger.error('Error writing file', { error, filePath });
    throw new AppError(500, `Failed to write file: ${filePath}`);
  }
}

export function safeReadFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    logger.error('Error reading file', { error, filePath });
    throw new AppError(500, `Failed to read file: ${filePath}`);
  }
}

export function safeDeleteFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    logger.error('Error deleting file', { error, filePath });
    throw new AppError(500, `Failed to delete file: ${filePath}`);
  }
}