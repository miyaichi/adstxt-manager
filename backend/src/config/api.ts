// API Configuration
interface ApiConfig {
  enabled: boolean;
  validApiKeys: string[];
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}

// Default configuration values
const defaultConfig: ApiConfig = {
  enabled: process.env.API_INTEGRATION_ENABLED === 'true',
  validApiKeys: process.env.API_VALID_KEYS ? process.env.API_VALID_KEYS.split(',') : [],
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
  },
};

export default {
  api: defaultConfig,
};