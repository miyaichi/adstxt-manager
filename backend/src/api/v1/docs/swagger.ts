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
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: '/api/v1',
        description: 'Development server'
      }
    ],
    tags,
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key'
        }
      },
      schemas: definitions
    },
    security: [
      {
        ApiKeyAuth: []
      }
    ]
  },
  apis: ['./src/api/v1/routes/*.ts'],
};

export const specs = swaggerJsdoc(options);