import dotenv from 'dotenv';

dotenv.config();

// Application configuration variables
export default {
  server: {
    port: process.env.PORT || 4000,
    env: process.env.NODE_ENV || 'development',
    appUrl: process.env.APP_URL || 'http://localhost:3000'
  },
  email: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '1025', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'adstxt-manager@example.com',
    fromName: process.env.SMTP_FROM_NAME || 'Ads.txt Manager'
  },
  security: {
    tokenSecret: process.env.TOKEN_SECRET || 'default_secret_key_change_in_production',
    tokenExpiry: '7d' // Token expiry time
  },
  database: {
    path: process.env.DB_PATH || './src/db/database.sqlite'
  }
};