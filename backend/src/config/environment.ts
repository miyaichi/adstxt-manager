import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Try to load .env file if it exists
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config();
} else {
  console.log('No .env file found, using environment variables or defaults');
}

/**
 * Determines if the application is running in a local development environment
 */
export const isLocalEnvironment = (): boolean => {
  return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
};

/**
 * Determines if the application is running in the AWS cloud environment
 */
export const isCloudEnvironment = (): boolean => {
  return (
    process.env.NODE_ENV === 'production' &&
    (!!process.env.AWS_REGION || !!process.env.AWS_EXECUTION_ENV)
  );
};


/**
 * Gets the current environment configuration
 */
export interface Environment {
  NODE_ENV: string;
  IS_LOCAL: boolean;
  IS_CLOUD: boolean;
}

/**
 * Gets the current environment
 */
export const getEnvironment = (): Environment => {
  const nodeEnv = process.env.NODE_ENV || 'development';

  return {
    NODE_ENV: nodeEnv,
    IS_LOCAL: isLocalEnvironment(),
    IS_CLOUD: isCloudEnvironment(),
  };
};
