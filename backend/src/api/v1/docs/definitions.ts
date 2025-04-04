/**
 * Common Schema Definitions for Swagger Documentation
 */
export const definitions = {
  Error: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: false
      },
      error: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            example: 'VALIDATION_ERROR'
          },
          message: {
            type: 'string',
            example: 'Validation failed'
          },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                param: {
                  type: 'string',
                  example: 'domain'
                },
                msg: {
                  type: 'string',
                  example: 'Domain is required'
                }
              }
            }
          }
        }
      }
    }
  },
  Request: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        example: '123e4567-e89b-12d3-a456-426614174000'
      },
      domain: {
        type: 'string',
        example: 'example.com'
      },
      email: {
        type: 'string',
        format: 'email',
        example: 'user@example.com'
      },
      changes: {
        type: 'string',
        example: 'Added new partner: google.com, pub-1234, DIRECT, f08c47fec0942fa0'
      },
      status: {
        type: 'string',
        enum: ['pending', 'approved', 'rejected'],
        example: 'pending'
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        example: '2023-01-01T00:00:00Z'
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        example: '2023-01-01T00:00:00Z'
      }
    }
  },
  PaginatedResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: true
      },
      data: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/Request'
        }
      },
      pagination: {
        type: 'object',
        properties: {
          total: {
            type: 'integer',
            example: 100
          },
          limit: {
            type: 'integer',
            example: 10
          },
          offset: {
            type: 'integer',
            example: 0
          },
          hasMore: {
            type: 'boolean',
            example: true
          }
        }
      }
    }
  }
};