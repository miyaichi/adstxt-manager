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
  HealthCheckResponse: {
    type: 'object',
    description: 'System health check response',
    required: ['status', 'timestamp', 'response_time_ms'],
    properties: {
      status: {
        type: 'string',
        enum: ['healthy', 'degraded', 'unhealthy'],
        description: 'Overall system status',
        example: 'healthy',
      },
      timestamp: {
        type: 'string',
        format: 'date-time',
        description: 'Timestamp when health check was performed',
        example: '2025-09-22T07:30:00.000Z',
      },
      response_time_ms: {
        type: 'integer',
        description: 'Response time in milliseconds',
        example: 45,
        minimum: 0,
      },
      metrics: {
        type: 'object',
        description: 'Performance metrics and recommendations',
        properties: {
          response_time_avg: {
            type: 'number',
            description: 'Average response time in milliseconds',
            example: 1200,
          },
          load: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            description: 'Current system load',
            example: 'low',
          },
          recommended_batch_size: {
            type: 'integer',
            description: 'Recommended batch size for optimal performance',
            example: 50,
          },
          suggested_delay_ms: {
            type: 'integer',
            description: 'Suggested delay between requests in milliseconds',
            example: 100,
          },
          cache_status: {
            type: 'string',
            enum: ['healthy', 'degraded', 'unhealthy'],
            description: 'Cache system status',
            example: 'healthy',
          },
          database_healthy: {
            type: 'boolean',
            description: 'Database connection status',
            example: true,
          },
          database_response_time_ms: {
            type: 'integer',
            description: 'Database response time in milliseconds',
            example: 12,
          },
        },
      },
      checks: {
        type: 'object',
        description: 'Individual system component checks',
        properties: {
          database: {
            type: 'string',
            enum: ['pass', 'fail'],
            description: 'Database check result',
            example: 'pass',
          },
          cache: {
            type: 'string',
            enum: ['pass', 'fail'],
            description: 'Cache check result',
            example: 'pass',
          },
          response_time: {
            type: 'string',
            enum: ['pass', 'fail'],
            description: 'Response time check result',
            example: 'pass',
          },
          avg_performance: {
            type: 'string',
            enum: ['pass', 'fail'],
            description: 'Average performance check result',
            example: 'pass',
          },
        },
      },
    },
  },
  PerformanceStatsResponse: {
    type: 'object',
    description: 'Performance statistics and optimization recommendations',
    required: ['timestamp', 'performance', 'cache', 'recommendations', 'endpoints'],
    properties: {
      timestamp: {
        type: 'string',
        format: 'date-time',
        description: 'Timestamp when statistics were collected',
        example: '2025-09-22T07:30:00.000Z',
      },
      performance: {
        type: 'object',
        description: 'Current performance metrics',
        properties: {
          avg_response_time_ms: {
            type: 'number',
            description: 'Average response time in milliseconds',
            example: 1200,
          },
          current_load: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            description: 'Current system load',
            example: 'low',
          },
          suggested_batch_size: {
            type: 'integer',
            description: 'Suggested batch size for current conditions',
            example: 50,
          },
          suggested_delay_ms: {
            type: 'integer',
            description: 'Suggested delay between requests',
            example: 100,
          },
        },
      },
      cache: {
        type: 'object',
        description: 'Cache performance and statistics',
        properties: {
          status: {
            type: 'string',
            enum: ['healthy', 'degraded', 'unhealthy'],
            description: 'Cache system status',
            example: 'healthy',
          },
          hit_rate: {
            type: 'number',
            description: 'Cache hit rate (0.0 to 1.0)',
            example: 0.95,
            minimum: 0,
            maximum: 1,
          },
          total_domains: {
            type: 'integer',
            description: 'Total number of cached domains',
            example: 1250,
          },
          statistics: {
            type: 'object',
            properties: {
              successful: {
                type: 'integer',
                description: 'Number of successful cache entries',
                example: 1150,
              },
              errors: {
                type: 'integer',
                description: 'Number of error cache entries',
                example: 50,
              },
              not_found: {
                type: 'integer',
                description: 'Number of not found cache entries',
                example: 50,
              },
              last_updated: {
                type: 'string',
                format: 'date-time',
                description: 'Last cache update timestamp',
                example: '2025-09-22T06:00:00.000Z',
              },
            },
          },
        },
      },
      recommendations: {
        type: 'object',
        description: 'Performance optimization recommendations',
        properties: {
          optimal_batch_size: {
            type: 'integer',
            description: 'Optimal batch size for current conditions',
            example: 50,
          },
          request_delay_ms: {
            type: 'integer',
            description: 'Recommended delay between requests',
            example: 100,
          },
          use_streaming: {
            type: 'boolean',
            description: 'Whether to use streaming for large requests',
            example: false,
          },
          use_parallel: {
            type: 'boolean',
            description: 'Whether to use parallel processing',
            example: true,
          },
        },
      },
      endpoints: {
        type: 'object',
        description: 'Available API endpoints',
        properties: {
          standard_batch: {
            type: 'string',
            description: 'Standard batch endpoint',
            example: '/sellersjson/{domain}/sellers/batch',
          },
          streaming_batch: {
            type: 'string',
            description: 'Streaming batch endpoint',
            example: '/sellersjson/{domain}/sellers/batch/stream',
          },
          parallel_batch: {
            type: 'string',
            description: 'Parallel batch endpoint',
            example: '/sellersjson/batch/parallel',
          },
          health_check: {
            type: 'string',
            description: 'Health check endpoint',
            example: '/sellersjson/health',
          },
          stats: {
            type: 'string',
            description: 'Statistics endpoint',
            example: '/sellersjson/stats',
          },
        },
      },
    },
  },
  ParallelBatchRequest: {
    type: 'object',
    description: 'Request for parallel batch processing of multiple domains',
    required: ['requests'],
    properties: {
      requests: {
        type: 'array',
        description: 'Array of domain requests to process in parallel',
        items: {
          type: 'object',
          required: ['domain', 'sellerIds'],
          properties: {
            domain: {
              type: 'string',
              description: 'Domain to query for sellers.json',
              example: 'google.com',
            },
            sellerIds: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Array of seller IDs to find in this domain',
              example: ['pub-1234567890123456', 'pub-0987654321'],
              minItems: 1,
              maxItems: 100,
            },
          },
        },
        minItems: 1,
        maxItems: 10,
      },
      max_concurrent: {
        type: 'integer',
        description: 'Maximum number of concurrent requests (1-10)',
        example: 5,
        minimum: 1,
        maximum: 10,
        default: 5,
      },
      fail_fast: {
        type: 'boolean',
        description: 'Whether to stop processing on first error',
        example: false,
        default: false,
      },
      return_partial: {
        type: 'boolean',
        description: 'Whether to return partial results if some requests fail',
        example: true,
        default: true,
      },
    },
  },
  ParallelBatchResponse: {
    type: 'object',
    description: 'Response from parallel batch processing',
    required: ['success', 'data'],
    properties: {
      success: {
        type: 'boolean',
        description: 'Whether the request was successful',
        example: true,
      },
      data: {
        type: 'object',
        description: 'Parallel processing results',
        required: ['parallel_processing', 'results', 'processing_time_ms'],
        properties: {
          parallel_processing: {
            type: 'object',
            description: 'Summary of parallel processing',
            properties: {
              total_domains: {
                type: 'integer',
                description: 'Total number of domains requested',
                example: 2,
              },
              completed_domains: {
                type: 'integer',
                description: 'Number of domains successfully processed',
                example: 2,
              },
              failed_domains: {
                type: 'integer',
                description: 'Number of domains that failed processing',
                example: 0,
              },
              max_concurrent: {
                type: 'integer',
                description: 'Maximum concurrent requests used',
                example: 5,
              },
              total_requested_sellers: {
                type: 'integer',
                description: 'Total number of sellers requested across all domains',
                example: 4,
              },
              total_found_sellers: {
                type: 'integer',
                description: 'Total number of sellers found across all domains',
                example: 3,
              },
            },
          },
          results: {
            type: 'array',
            description: 'Results for each domain',
            items: {
              type: 'object',
              properties: {
                domain: {
                  type: 'string',
                  description: 'Domain that was processed',
                  example: 'google.com',
                },
                requested_count: {
                  type: 'integer',
                  description: 'Number of sellers requested for this domain',
                  example: 2,
                },
                found_count: {
                  type: 'integer',
                  description: 'Number of sellers found for this domain',
                  example: 2,
                },
                results: {
                  type: 'array',
                  description: 'Seller results for this domain',
                  items: {
                    $ref: '#/components/schemas/SellerResult',
                  },
                },
                processing_time_ms: {
                  type: 'integer',
                  description: 'Processing time for this domain',
                  example: 234,
                },
                processing_method: {
                  type: 'string',
                  description: 'Processing method used',
                  example: 'optimized_jsonb',
                },
              },
            },
          },
          processing_time_ms: {
            type: 'integer',
            description: 'Total processing time for all domains',
            example: 456,
          },
        },
      },
    },
  },
  AdsTxtRecord: {
    type: 'object',
    description: 'Parsed ads.txt record entry',
    properties: {
      domain: {
        type: 'string',
        description: 'Advertising system domain',
        example: 'google.com',
      },
      account_id: {
        type: 'string',
        description: 'Publisher account ID',
        example: 'pub-1234567890',
      },
      relationship: {
        type: 'string',
        enum: ['DIRECT', 'RESELLER'],
        description: 'Relationship type',
        example: 'DIRECT',
      },
      certification_authority_id: {
        type: 'string',
        description: 'TAG ID or other certification authority',
        example: 'f08c47fec0942fa0',
        nullable: true,
      },
      is_valid: {
        type: 'boolean',
        description: 'Whether the record is valid',
        example: true,
      },
      line_number: {
        type: 'integer',
        description: 'Line number in the file',
        example: 1,
      },
    },
  },
  QuickValidationRequest: {
    type: 'object',
    description: 'Request for quick ads.txt validation',
    required: ['content'],
    properties: {
      content: {
        type: 'string',
        description: 'Ads.txt file content to validate',
        example: 'google.com, pub-1234567890, DIRECT, f08c47fec0942fa0\nfacebook.com, 123456789, DIRECT',
      },
      checkDuplicates: {
        type: 'boolean',
        description: 'Whether to check for duplicate entries',
        example: true,
        default: true,
      },
    },
  },
  QuickValidationResponse: {
    type: 'object',
    description: 'Response from quick validation',
    required: ['success', 'data'],
    properties: {
      success: {
        type: 'boolean',
        description: 'Whether the request was successful',
        example: true,
      },
      data: {
        type: 'object',
        required: ['isValid', 'records', 'errors', 'warnings', 'statistics'],
        properties: {
          isValid: {
            type: 'boolean',
            description: 'Whether the content is valid',
            example: true,
          },
          records: {
            type: 'array',
            description: 'Parsed ads.txt records',
            items: {
              $ref: '#/components/schemas/AdsTxtRecord',
            },
          },
          errors: {
            type: 'array',
            description: 'Validation errors',
            items: {
              type: 'object',
              properties: {
                line: {
                  type: 'integer',
                  description: 'Line number where error occurred',
                  example: 3,
                },
                message: {
                  type: 'string',
                  description: 'Error message',
                  example: 'invalidFormat',
                },
                severity: {
                  type: 'string',
                  enum: ['error', 'warning'],
                  description: 'Error severity',
                  example: 'error',
                },
              },
            },
          },
          warnings: {
            type: 'array',
            description: 'Validation warnings (e.g., duplicates)',
            items: {
              type: 'object',
              properties: {
                line: {
                  type: 'integer',
                  description: 'Line number',
                  example: 5,
                },
                message: {
                  type: 'string',
                  description: 'Warning message',
                  example: 'Duplicate entry: google.com, pub-123, DIRECT',
                },
                severity: {
                  type: 'string',
                  enum: ['error', 'warning'],
                  example: 'warning',
                },
                original_line: {
                  type: 'integer',
                  description: 'Line number of original entry',
                  example: 2,
                },
              },
            },
          },
          statistics: {
            type: 'object',
            description: 'Validation statistics',
            properties: {
              totalLines: {
                type: 'integer',
                description: 'Total lines in file',
                example: 25,
              },
              validRecords: {
                type: 'integer',
                description: 'Number of valid records',
                example: 20,
              },
              invalidRecords: {
                type: 'integer',
                description: 'Number of invalid records',
                example: 0,
              },
              variables: {
                type: 'integer',
                description: 'Number of variable declarations',
                example: 2,
              },
              comments: {
                type: 'integer',
                description: 'Number of comment lines',
                example: 3,
              },
              duplicates: {
                type: 'integer',
                description: 'Number of duplicate entries',
                example: 0,
              },
            },
          },
        },
      },
    },
  },
  DomainInfoResponse: {
    type: 'object',
    description: 'Comprehensive domain information',
    required: ['success', 'data'],
    properties: {
      success: {
        type: 'boolean',
        description: 'Whether the request was successful',
        example: true,
      },
      data: {
        type: 'object',
        required: ['domain', 'ads_txt', 'sellers_json'],
        properties: {
          domain: {
            type: 'string',
            description: 'Domain name',
            example: 'example.com',
          },
          ads_txt: {
            type: 'object',
            description: 'Ads.txt information',
            properties: {
              exists: {
                type: 'boolean',
                description: 'Whether ads.txt exists',
                example: true,
              },
              last_fetched: {
                type: 'string',
                format: 'date-time',
                description: 'Last fetch timestamp',
                example: '2024-01-01T00:00:00Z',
              },
              status: {
                type: 'string',
                enum: ['success', 'not_found', 'error'],
                description: 'Cache status',
                example: 'success',
              },
              record_count: {
                type: 'integer',
                description: 'Number of records',
                example: 25,
              },
            },
          },
          sellers_json: {
            type: 'object',
            description: 'Sellers.json information',
            properties: {
              exists: {
                type: 'boolean',
                description: 'Whether sellers.json exists',
                example: true,
              },
              last_fetched: {
                type: 'string',
                format: 'date-time',
                description: 'Last fetch timestamp',
                example: '2024-01-01T00:00:00Z',
              },
              status: {
                type: 'string',
                enum: ['success', 'not_found', 'error', 'invalid_format'],
                description: 'Cache status',
                example: 'success',
              },
              seller_count: {
                type: 'integer',
                description: 'Number of sellers',
                example: 150,
              },
            },
          },
        },
      },
    },
  },
  BatchDomainInfoRequest: {
    type: 'object',
    description: 'Request for batch domain information',
    required: ['domains'],
    properties: {
      domains: {
        type: 'array',
        description: 'Array of domain names (max 50)',
        items: {
          type: 'string',
          example: 'example.com',
        },
        minItems: 1,
        maxItems: 50,
      },
    },
  },
  BatchDomainInfoResponse: {
    type: 'object',
    description: 'Batch domain information response',
    required: ['success', 'data'],
    properties: {
      success: {
        type: 'boolean',
        description: 'Whether the request was successful',
        example: true,
      },
      data: {
        type: 'object',
        required: ['domains', 'summary'],
        properties: {
          domains: {
            type: 'array',
            description: 'Domain information for each requested domain',
            items: {
              type: 'object',
              properties: {
                domain: {
                  type: 'string',
                  example: 'example.com',
                },
                ads_txt: {
                  type: 'object',
                  properties: {
                    exists: {
                      type: 'boolean',
                      example: true,
                    },
                    status: {
                      type: 'string',
                      enum: ['success', 'not_found', 'error'],
                      example: 'success',
                    },
                    record_count: {
                      type: 'integer',
                      example: 25,
                    },
                  },
                },
                sellers_json: {
                  type: 'object',
                  properties: {
                    exists: {
                      type: 'boolean',
                      example: true,
                    },
                    status: {
                      type: 'string',
                      enum: ['success', 'not_found', 'error', 'invalid_format'],
                      example: 'success',
                    },
                    seller_count: {
                      type: 'integer',
                      example: 150,
                    },
                  },
                },
              },
            },
          },
          summary: {
            type: 'object',
            description: 'Summary statistics',
            properties: {
              total_domains: {
                type: 'integer',
                description: 'Total domains queried',
                example: 3,
              },
              with_ads_txt: {
                type: 'integer',
                description: 'Domains with ads.txt',
                example: 2,
              },
              with_sellers_json: {
                type: 'integer',
                description: 'Domains with sellers.json',
                example: 1,
              },
              with_both: {
                type: 'integer',
                description: 'Domains with both files',
                example: 1,
              },
            },
          },
        },
      },
    },
  },
};
