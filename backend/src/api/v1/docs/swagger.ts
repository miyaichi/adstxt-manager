import swaggerJsdoc from 'swagger-jsdoc';
import { tags } from './tags';
import { definitions } from './definitions';

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
        url: '/api/v1',
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
    // 本番環境用（ビルド後）
    './dist/api/v1/routes/*.js',
    // 本番環境での絶対パス
    '/app/dist/api/v1/routes/*.js',
  ],
};

export const specs = swaggerJsdoc(options);
