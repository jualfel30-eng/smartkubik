import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { WinstonModuleOptions, utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';

const DEFAULT_LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_DIRECTORY =
  process.env.LOG_DIRECTORY ||
  (process.env.LOG_FILE_PATH ? dirname(process.env.LOG_FILE_PATH) : join(process.cwd(), 'logs'));

function ensureLogDirectory(): void {
  if (!existsSync(LOG_DIRECTORY)) {
    mkdirSync(LOG_DIRECTORY, { recursive: true });
  }
}

export function createWinstonLoggerOptions(): WinstonModuleOptions {
  ensureLogDirectory();

  const isTestEnvironment =
    process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID;

  const transports: winston.transport[] = [
    new winston.transports.Console({
      level: DEFAULT_LOG_LEVEL,
      format: winston.format.combine(
        winston.format.timestamp(),
        nestWinstonModuleUtilities.format.nestLike('FoodInventorySaaS', {
          prettyPrint: true,
          colors: !process.env.NO_COLOR,
        }),
      ),
    }),
  ];

  if (!isTestEnvironment) {
    transports.push(
      new winston.transports.File({
        filename: join(LOG_DIRECTORY, 'application.log'),
        level: DEFAULT_LOG_LEVEL,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
      new winston.transports.File({
        filename: join(LOG_DIRECTORY, 'errors.log'),
        level: 'error',
        maxsize: 5 * 1024 * 1024, // 5MB
        maxFiles: 3,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    );
  }

  return {
    level: DEFAULT_LOG_LEVEL,
    transports,
    exitOnError: false,
  };
}
