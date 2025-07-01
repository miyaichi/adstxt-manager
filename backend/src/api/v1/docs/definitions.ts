/**
 * Common Schema Definitions for Swagger Documentation
 */
export const definitions = {
  Error: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: false,
      },
      error: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            example: 'VALIDATION_ERROR',
          },
          message: {
            type: 'string',
            example: 'Validation failed',
          },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                param: {
                  type: 'string',
                  example: 'domain',
                },
                msg: {
                  type: 'string',
                  example: 'Domain is required',
                },
              },
            },
          },
        },
      },
    },
  },
  Request: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        example: '123e4567-e89b-12d3-a456-426614174000',
      },
      domain: {
        type: 'string',
        example: 'example.com',
      },
      email: {
        type: 'string',
        format: 'email',
        example: 'user@example.com',
      },
      changes: {
        type: 'string',
        example: 'Added new partner: google.com, pub-1234, DIRECT, f08c47fec0942fa0',
      },
      status: {
        type: 'string',
        enum: ['pending', 'approved', 'rejected'],
        example: 'pending',
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        example: '2023-01-01T00:00:00Z',
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        example: '2023-01-01T00:00:00Z',
      },
    },
  },
  PaginatedResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: true,
      },
      data: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/Request',
        },
      },
      pagination: {
        type: 'object',
        properties: {
          total: {
            type: 'integer',
            example: 100,
          },
          limit: {
            type: 'integer',
            example: 10,
          },
          offset: {
            type: 'integer',
            example: 0,
          },
          hasMore: {
            type: 'boolean',
            example: true,
          },
        },
      },
    },
  },
  SellerResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: true,
      },
      data: {
        type: 'object',
        properties: {
          domain: {
            type: 'string',
            example: 'google.com',
          },
          seller: {
            type: 'object',
            nullable: true,
            properties: {
              seller_id: {
                type: 'string',
                example: 'pub-1234567890123456',
              },
              name: {
                type: 'string',
                example: 'Google AdSense',
              },
              seller_type: {
                type: 'string',
                enum: ['PUBLISHER', 'INTERMEDIARY', 'BOTH'],
                example: 'PUBLISHER',
              },
              domain: {
                type: 'string',
                example: 'google.com',
              },
            },
          },
          found: {
            type: 'boolean',
            example: true,
          },
          key: {
            type: 'string',
            nullable: true,
            example: null,
          },
          params: {
            type: 'object',
            nullable: true,
            example: null,
          },
          metadata: {
            type: 'object',
            properties: {
              contact_email: {
                type: 'string',
                example: 'contact@google.com',
              },
              contact_address: {
                type: 'string',
                example: '1600 Amphitheatre Parkway, Mountain View, CA 94043',
              },
              version: {
                type: 'string',
                example: '1.0',
              },
              seller_count: {
                type: 'integer',
                example: 1,
              },
              identifiers: {
                type: 'array',
                nullable: true,
                example: null,
              },
            },
          },
          cache: {
            type: 'object',
            properties: {
              is_cached: {
                type: 'boolean',
                example: true,
              },
              last_updated: {
                type: 'string',
                format: 'date-time',
                example: '2023-01-01T00:00:00Z',
              },
              status: {
                type: 'string',
                enum: ['success', 'not_found', 'error', 'invalid_format'],
                example: 'success',
              },
              expires_at: {
                type: 'string',
                format: 'date-time',
                nullable: true,
                example: '2023-01-02T00:00:00Z',
              },
            },
          },
        },
      },
    },
  },
};
