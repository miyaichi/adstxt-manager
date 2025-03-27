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
 * Determines if the application is running in the AWS Amplify environment
 */
export const isAmplifyEnvironment = (): boolean => {
  return !!process.env.AWS_EXECUTION_ENV && process.env.AWS_EXECUTION_ENV.includes('AWS_Amplify');
};

/**
 * Gets the current environment
 */
export const getEnvironment = (): 'local' | 'cloud' => {
  return isLocalEnvironment() ? 'local' : 'cloud';
};
