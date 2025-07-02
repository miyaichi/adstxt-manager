/**
 * API Tags for Swagger Documentation
 */
export const tags = [
  {
    name: 'Requests',
    description: 'Operations related to ad.txt change requests',
  },
  {
    name: 'Status',
    description: 'API status and health information',
  },
  {
    name: 'SellersJson',
    description: 'Operations related to sellers.json data retrieval',
  },
  {
    name: 'SellersJson Batch',
    description: 'High-performance batch operations for sellers.json data retrieval. Key Features: Retrieve up to 100 sellers in a single request, Significant performance improvement over individual requests, Built-in caching with force refresh option, Detailed metadata and cache information, Comprehensive error handling. Performance improvement: ~80% faster than individual requests.',
  },
];
