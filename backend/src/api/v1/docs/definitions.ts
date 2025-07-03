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
  BatchSellersResponse: {
    type: 'object',
    description: 'Response containing multiple seller results',
    required: ['success', 'data'],
    properties: {
      success: {
        type: 'boolean',
        description: 'Indicates if the request was successful',
        example: true,
      },
      data: {
        type: 'object',
        description: 'Response data containing seller results',
        required: ['domain', 'requested_count', 'found_count', 'results'],
        properties: {
          domain: {
            type: 'string',
            description: 'The domain that was queried',
            example: 'impact-ad.jp',
          },
          requested_count: {
            type: 'integer',
            description: 'Total number of seller IDs requested',
            example: 3,
            minimum: 1,
            maximum: 100,
          },
          found_count: {
            type: 'integer',
            description: 'Number of sellers found in sellers.json',
            example: 2,
            minimum: 0,
          },
          results: {
            type: 'array',
            description: 'Array of seller results, one per requested seller ID',
            items: {
              $ref: '#/components/schemas/SellerResult',
            },
            minItems: 1,
            maxItems: 100,
          },
          metadata: {
            $ref: '#/components/schemas/SellersJsonMetadata',
          },
          cache: {
            $ref: '#/components/schemas/CacheInfo',
          },
          processing_time_ms: {
            type: 'integer',
            description: 'Server-side processing time in milliseconds',
            example: 45,
            minimum: 0,
          },
        },
      },
    },
  },
  SellerResult: {
    type: 'object',
    description: 'Result for a single seller ID lookup',
    required: ['sellerId', 'found'],
    properties: {
      sellerId: {
        type: 'string',
        description: 'The seller ID that was requested',
        example: '3305',
      },
      seller: {
        $ref: '#/components/schemas/Seller',
      },
      found: {
        type: 'boolean',
        description: 'Whether the seller was found in sellers.json',
        example: true,
      },
      source: {
        type: 'string',
        enum: ['cache', 'fresh'],
        description: 'Whether the data came from cache or was freshly fetched',
        example: 'cache',
      },
      error: {
        type: 'string',
        description: 'Error message if the seller lookup failed',
        example: 'Seller not found in sellers.json',
      },
    },
  },
  Seller: {
    type: 'object',
    description: 'Seller information from sellers.json',
    required: ['seller_id', 'seller_type'],
    properties: {
      seller_id: {
        type: 'string',
        description: 'Unique seller identifier',
        example: '3305',
      },
      name: {
        type: 'string',
        description: 'Human-readable name of the seller',
        example: '株式会社日本経済新聞社',
      },
      domain: {
        type: 'string',
        description: 'Domain associated with the seller',
        example: 'nikkei.co.jp',
      },
      seller_type: {
        type: 'string',
        enum: ['PUBLISHER', 'INTERMEDIARY', 'BOTH'],
        description: 'Type of seller: PUBLISHER, INTERMEDIARY, or BOTH',
        example: 'PUBLISHER',
      },
    },
  },
  SellersJsonMetadata: {
    type: 'object',
    description: 'Metadata from the sellers.json file',
    properties: {
      version: {
        type: 'string',
        description: 'Version of the sellers.json specification',
        example: '1.0',
      },
      contact_email: {
        type: 'string',
        format: 'email',
        description: 'Contact email for the sellers.json file',
        example: 'y1support@platform-one.co.jp',
      },
      contact_address: {
        type: 'string',
        description: 'Physical address of the organization',
        example:
          'Platform One Inc, Yebisu Garden Place Tower 33F, 4-20-3 Ebisu, Shibuya-ku Tokyo, Japan',
      },
      seller_count: {
        type: 'integer',
        description: 'Total number of sellers in the sellers.json file',
        example: 1316,
        minimum: 0,
      },
      identifiers: {
        type: 'array',
        items: {
          type: 'object',
        },
        description: 'Additional identifiers for the organization',
        nullable: true,
      },
    },
  },
  CacheInfo: {
    type: 'object',
    description: 'Information about cache status',
    required: ['is_cached', 'status'],
    properties: {
      is_cached: {
        type: 'boolean',
        description: 'Whether the response came from cache',
        example: true,
      },
      last_updated: {
        type: 'string',
        format: 'date-time',
        description: 'When the cached data was last updated',
        example: '2025-07-02T21:07:57.127Z',
      },
      status: {
        type: 'string',
        enum: ['success', 'error', 'stale'],
        description: 'Cache status',
        example: 'success',
      },
      expires_at: {
        type: 'string',
        format: 'date-time',
        description: 'When the cached data expires',
        example: '2025-07-03T21:07:57.127Z',
      },
    },
  },
};
