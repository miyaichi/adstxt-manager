import swaggerJsdoc from 'swagger-jsdoc';
import { definitions } from './definitions';
import { tags } from './tags';

/**
 * Swagger configuration options
 */
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Ads.txt Manager External API',
      version: '1.0.0',
      description: 'External integration API for Ads.txt Manager',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: 'https://adstxt-manager.jp/api/v1',
        description: 'Production server',
      },
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server',
      },
    ],
    tags,
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
      },
      schemas: definitions,
    },
    security: [
      {
        ApiKeyAuth: [],
      },
    ],
  },
  apis: [
    // 開発環境用
    './src/api/v1/routes/*.ts',
    // 本番環境用（複数のパスを試す）
    './api/v1/routes/*.js',
    './backend/src/api/v1/routes/*.js',
    './dist/api/v1/routes/*.js',
  ],
};

console.log('Current working directory:', process.cwd());
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Swagger API paths:', options.apis);

export const specs = swaggerJsdoc(options);

console.log('Swagger specs generated:', Object.keys(specs.paths || {}).length, 'paths found');
