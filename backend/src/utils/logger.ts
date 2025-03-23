/**
 * Logger for backend
 */

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const isDevEnv = process.env.NODE_ENV === 'development';
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const currentLogLevel = LOG_LEVELS[LOG_LEVEL] || LOG_LEVELS.info;

class Logger {
  private prefix: string;

  constructor(prefix: string = '') {
    this.prefix = prefix ? `[${prefix}] ` : '';
  }

  error(...args: any[]): void {
    if (currentLogLevel >= LOG_LEVELS.error) {
      console.error(`${this.prefix}ERROR:`, ...args);
    }
  }

  warn(...args: any[]): void {
    if (currentLogLevel >= LOG_LEVELS.warn) {
      console.warn(`${this.prefix}WARN:`, ...args);
    }
  }

  info(...args: any[]): void {
    if (currentLogLevel >= LOG_LEVELS.info) {
      console.log(`${this.prefix}INFO:`, ...args);
    }
  }

  debug(...args: any[]): void {
    if (currentLogLevel >= LOG_LEVELS.debug || isTestEnv) {
      console.log(`${this.prefix}DEBUG:`, ...args);
    }
  }

  dev(...args: any[]): void {
    if (isDevEnv) {
      console.log(`${this.prefix}DEV:`, ...args);
    }
  }
}

const defaultLogger = new Logger();

export const createLogger = (name: string): Logger => {
  return new Logger(name);
};

export default defaultLogger;