/**
 * Logger Utility
 * Control log level based on environment variables
 */

const isTestEnv = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

class Logger {
  private prefix: string;

  constructor(prefix: string = '') {
    this.prefix = prefix ? `[${prefix}] ` : '';
  }

  info(...args: any[]): void {
    console.log(`${this.prefix}INFO:`, ...args);
  }

  warn(...args: any[]): void {
    console.warn(`${this.prefix}WARN:`, ...args);
  }

  error(...args: any[]): void {
    console.error(`${this.prefix}ERROR:`, ...args);
  }

  debug(...args: any[]): void {
    if (isTestEnv) {
      console.log(`${this.prefix}DEBUG:`, ...args);
    }
  }

  dev(...args: any[]): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`${this.prefix}DEV:`, ...args);
    }
  }
}

const defaultLogger = new Logger();

export const createLogger = (name: string): Logger => {
  return new Logger(name);
};

export default defaultLogger;
