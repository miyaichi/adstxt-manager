import dotenv from 'dotenv';

dotenv.config();

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
  return process.env.NODE_ENV === 'production' && !!process.env.AWS_REGION;
};

/**
 * Gets the current environment
 */
export const getEnvironment = (): 'local' | 'cloud' => {
  return isLocalEnvironment() ? 'local' : 'cloud';
};
