import express from 'express';
import {
  getSellerById,
  batchGetSellers,
  batchGetSellersStream,
  batchGetSellersParallel,
  getHealthCheck,
  getPerformanceStats,
} from '../../../controllers/sellersJsonController';
import { validateApiKeyOrExtension } from '../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * /sellersjson/health:
 *   get:
 *     summary: System health check
 *     description: |
 *       Returns the current system health status and performance metrics.
 *       This endpoint provides real-time monitoring information including:
 *       - Overall system status (healthy/degraded/unhealthy)
 *       - Performance metrics and recommendations
 *       - Individual component health checks
 *       - Suggested optimization parameters
 *     tags: [SellersJson Monitoring]
 *     responses:
 *       200:
 *         description: Health check completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheckResponse'
 *             examples:
 *               healthy:
 *                 summary: System is healthy
 *                 value:
 *                   status: "healthy"
 *                   timestamp: "2025-09-22T07:30:00.000Z"
 *                   response_time_ms: 45
 *                   metrics:
 *                     response_time_avg: 1200
 *                     load: "low"
 *                     recommended_batch_size: 50
 *                     suggested_delay_ms: 100
 *                     cache_status: "healthy"
 *                     database_healthy: true
 *                     database_response_time_ms: 12
 *                   checks:
 *                     database: "pass"
 *                     cache: "pass"
 *                     response_time: "pass"
 *                     avg_performance: "pass"
 *               degraded:
 *                 summary: System is degraded
 *                 value:
 *                   status: "degraded"
 *                   timestamp: "2025-09-22T07:30:00.000Z"
 *                   response_time_ms: 1500
 *                   metrics:
 *                     response_time_avg: 2500
 *                     load: "high"
 *                     recommended_batch_size: 20
 *                     suggested_delay_ms: 500
 *                     cache_status: "healthy"
 *                     database_healthy: true
 *                     database_response_time_ms: 45
 *                   checks:
 *                     database: "pass"
 *                     cache: "pass"
 *                     response_time: "fail"
 *                     avg_performance: "fail"
 *       500:
 *         description: Health check failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Health check endpoint - no auth required for monitoring
router.get('/health', getHealthCheck);

/**
 * @swagger
 * /sellersjson/stats:
 *   get:
 *     summary: Performance statistics and recommendations
 *     description: |
 *       Returns detailed performance statistics and optimization recommendations.
 *       This endpoint provides:
 *       - Current performance metrics
 *       - Cache statistics and hit rates
 *       - Optimization recommendations
 *       - Available endpoint information
 *     tags: [SellersJson Monitoring]
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PerformanceStatsResponse'
 *             examples:
 *               normal_load:
 *                 summary: Normal system load
 *                 value:
 *                   timestamp: "2025-09-22T07:30:00.000Z"
 *                   performance:
 *                     avg_response_time_ms: 1200
 *                     current_load: "low"
 *                     suggested_batch_size: 50
 *                     suggested_delay_ms: 100
 *                   cache:
 *                     status: "healthy"
 *                     hit_rate: 0.95
 *                     total_domains: 1250
 *                     statistics:
 *                       successful: 1150
 *                       errors: 50
 *                       not_found: 50
 *                       last_updated: "2025-09-22T06:00:00.000Z"
 *                   recommendations:
 *                     optimal_batch_size: 50
 *                     request_delay_ms: 100
 *                     use_streaming: false
 *                     use_parallel: true
 *                   endpoints:
 *                     standard_batch: "/sellersjson/{domain}/sellers/batch"
 *                     streaming_batch: "/sellersjson/{domain}/sellers/batch/stream"
 *                     parallel_batch: "/sellersjson/batch/parallel"
 *                     health_check: "/sellersjson/health"
 *                     stats: "/sellersjson/stats"
 *       500:
 *         description: Failed to retrieve statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Performance statistics endpoint - no auth required for monitoring
router.get('/stats', getPerformanceStats);

/**
 * @swagger
 * /sellersjson/batch/parallel:
 *   post:
 *     summary: Parallel batch processing for multiple domains
 *     description: |
 *       Process sellers.json data from multiple domains in parallel.
 *
 *       **Key Features:**
 *       - Process up to 10 domains simultaneously
 *       - 70-80% performance improvement over sequential processing
 *       - Configurable concurrency level (1-10 concurrent requests)
 *       - Partial result support - returns successful results even if some domains fail
 *       - Fail-fast option for early termination on errors
 *
 *       **Performance Benefits:**
 *       - Significantly reduced total processing time
 *       - Optimal for bulk data processing
 *       - Efficient resource utilization
 *
 *       **Rate Limits:**
 *       - Maximum 10 domains per request
 *       - Maximum 100 seller IDs per domain
 *       - 1000 requests per hour per API key
 *     tags: [SellersJson Parallel]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ParallelBatchRequest'
 *           examples:
 *             multiple_domains:
 *               summary: Multiple domains with different sellers
 *               value:
 *                 requests:
 *                   - domain: "google.com"
 *                     sellerIds: ["pub-1234567890123456", "pub-0987654321"]
 *                   - domain: "amazon.com"
 *                     sellerIds: ["amazon-123", "amazon-456"]
 *                 max_concurrent: 5
 *                 fail_fast: false
 *                 return_partial: true
 *     responses:
 *       200:
 *         description: Parallel processing completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ParallelBatchResponse'
 *             examples:
 *               success_all:
 *                 summary: All domains processed successfully
 *                 value:
 *                   success: true
 *                   data:
 *                     parallel_processing:
 *                       total_domains: 2
 *                       completed_domains: 2
 *                       failed_domains: 0
 *                       max_concurrent: 5
 *                       total_requested_sellers: 4
 *                       total_found_sellers: 3
 *                     results:
 *                       - domain: "google.com"
 *                         requested_count: 2
 *                         found_count: 2
 *                         results: []
 *                         processing_time_ms: 234
 *                         processing_method: "optimized_jsonb"
 *                     processing_time_ms: 456
 *       400:
 *         description: Bad request - Invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Missing API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Invalid API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many requests - Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Parallel batch processing endpoint for multiple domains
router.post('/batch/parallel', validateApiKeyOrExtension, batchGetSellersParallel);

/**
 * @swagger
 * /sellersjson/{domain}/sellers/batch/stream:
 *   post:
 *     summary: Streaming batch processing for large datasets
 *     description: |
 *       Process large batches of seller IDs with streaming response.
 *
 *       **Key Features:**
 *       - Real-time progressive response delivery
 *       - Memory-efficient processing of large datasets
 *       - Live progress updates during processing
 *       - Ideal for requests with 50+ seller IDs
 *
 *       **Benefits:**
 *       - Reduced perceived response time
 *       - Better user experience for large requests
 *       - Lower memory consumption
 *       - Early result availability
 *
 *       **Use Cases:**
 *       - Processing 50-100 seller IDs
 *       - Real-time data analysis
 *       - Progressive data loading
 *     tags: [SellersJson Streaming]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: domain
 *         required: true
 *         schema:
 *           type: string
 *         description: Domain to get sellers.json from
 *         example: impact-ad.jp
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sellerIds
 *             properties:
 *               sellerIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   minLength: 1
 *                   maxLength: 100
 *                 description: Array of seller IDs to fetch (recommended 50+ for streaming)
 *                 example: ["3305", "pub-1234567890123456", "9876543210"]
 *                 minItems: 1
 *                 maxItems: 100
 *               force:
 *                 type: boolean
 *                 description: Force refresh cache
 *                 default: false
 *                 example: false
 *           examples:
 *             large_batch:
 *               summary: Large batch for streaming
 *               value:
 *                 sellerIds: ["seller1", "seller2", "seller3", "seller4", "seller5"]
 *                 force: false
 *     responses:
 *       200:
 *         description: Streaming response with progressive results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BatchSellersResponse'
 *         headers:
 *           Transfer-Encoding:
 *             description: Chunked transfer encoding for streaming
 *             schema:
 *               type: string
 *               example: "chunked"
 *       400:
 *         description: Bad request - Invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Missing API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Invalid API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many requests - Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Streaming batch endpoint for progressive responses
router.post('/:domain/sellers/batch/stream', validateApiKeyOrExtension, batchGetSellersStream);

/**
 * @swagger
 * /sellersjson/{domain}/sellers/batch:
 *   post:
 *     summary: Get multiple sellers from a domain's sellers.json in a single request
 *     description: |
 *       Fetches multiple seller entries from a domain's sellers.json file in one HTTP request.
 *
 *       **Performance Benefits:**
 *       - Reduces HTTP overhead (multiple requests → single request)
 *       - Minimizes connection establishment overhead
 *       - Reduces total response time by 70-80%
 *       - Optimal for Chrome Extension environment with connection limits
 *
 *       **Rate Limits:**
 *       - Maximum 100 seller IDs per request
 *       - 1000 requests per hour per API key
 *       - 10,000 seller IDs per hour per API key
 *     tags: [SellersJson Batch]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: domain
 *         required: true
 *         schema:
 *           type: string
 *         description: Domain to get sellers.json from
 *         example: impact-ad.jp
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sellerIds
 *             properties:
 *               sellerIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   minLength: 1
 *                   maxLength: 100
 *                 description: Array of seller IDs to fetch
 *                 example: ["3305", "pub-1234567890123456", "9876543210"]
 *                 minItems: 1
 *                 maxItems: 100
 *               force:
 *                 type: boolean
 *                 description: Force refresh cache
 *                 default: false
 *                 example: false
 *     responses:
 *       200:
 *         description: Batch seller information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BatchSellersResponse'
 *             examples:
 *               success_all_found:
 *                 summary: All sellers found
 *                 value:
 *                   success: true
 *                   data:
 *                     domain: "example.com"
 *                     requested_count: 2
 *                     found_count: 2
 *                     results:
 *                       - sellerId: "1001"
 *                         seller:
 *                           seller_id: "1001"
 *                           seller_type: "PUBLISHER"
 *                           name: "Example Publisher 1"
 *                           domain: "example.com"
 *                         found: true
 *                         source: "cache"
 *                       - sellerId: "1002"
 *                         seller:
 *                           seller_id: "1002"
 *                           seller_type: "INTERMEDIARY"
 *                           name: "Example Intermediary"
 *                           domain: "example.com"
 *                         found: true
 *                         source: "cache"
 *                     metadata:
 *                       seller_count: 50
 *                       status: "success"
 *                     cache:
 *                       is_cached: true
 *                       last_updated: "2025-07-15T10:00:00.000Z"
 *                       status: "success"
 *                       expires_at: "2025-07-16T10:00:00.000Z"
 *                     processing_time_ms: 45
 *               partial_found:
 *                 summary: Some sellers found, some not found
 *                 value:
 *                   success: true
 *                   data:
 *                     domain: "example.com"
 *                     requested_count: 3
 *                     found_count: 2
 *                     results:
 *                       - sellerId: "1001"
 *                         seller:
 *                           seller_id: "1001"
 *                           seller_type: "PUBLISHER"
 *                           name: "Example Publisher 1"
 *                           domain: "example.com"
 *                         found: true
 *                         source: "cache"
 *                       - sellerId: "1002"
 *                         seller:
 *                           seller_id: "1002"
 *                           seller_type: "INTERMEDIARY"
 *                           name: "Example Intermediary"
 *                           domain: "example.com"
 *                         found: true
 *                         source: "cache"
 *                       - sellerId: "9999"
 *                         seller: null
 *                         found: false
 *                         error: "Seller not found in sellers.json"
 *                         source: "cache"
 *                     metadata:
 *                       seller_count: 50
 *                       status: "success"
 *                     cache:
 *                       is_cached: true
 *                       last_updated: "2025-07-15T10:00:00.000Z"
 *                       status: "success"
 *                       expires_at: "2025-07-16T10:00:00.000Z"
 *                     processing_time_ms: 67
 *               sellers_json_not_found:
 *                 summary: Domain's sellers.json not found
 *                 value:
 *                   success: true
 *                   data:
 *                     domain: "nonexistent-domain.com"
 *                     requested_count: 2
 *                     found_count: 0
 *                     results:
 *                       - sellerId: "1001"
 *                         seller: null
 *                         found: false
 *                         error: "sellers.json not found for domain"
 *                         source: "cache"
 *                       - sellerId: "1002"
 *                         seller: null
 *                         found: false
 *                         error: "sellers.json not found for domain"
 *                         source: "cache"
 *                     metadata:
 *                       seller_count: 0
 *                       status: "not_found"
 *                       error_message: "sellers.json file not found"
 *                     cache:
 *                       is_cached: true
 *                       last_updated: "2025-07-15T10:00:00.000Z"
 *                       status: "not_found"
 *                       expires_at: "2025-07-18T10:00:00.000Z"
 *                     processing_time_ms: 23
 *       400:
 *         description: Bad request - Invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Missing API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Invalid API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Domain's sellers.json not found (Note: This endpoint returns 200 with error details in response body. 404 is only returned for API-level errors)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many requests - Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:domain/sellers/batch', validateApiKeyOrExtension, batchGetSellers);

/**
 * @swagger
 * /sellersjson/{domain}/seller/{sellerId}:
 *   get:
 *     summary: Get a specific seller from a domain's sellers.json by seller ID
 *     tags: [SellersJson]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: domain
 *         required: true
 *         schema:
 *           type: string
 *         description: Domain to get sellers.json from
 *         example: google.com
 *       - in: path
 *         name: sellerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Seller ID to search for
 *         example: pub-1234567890123456
 *       - in: query
 *         name: force
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Force refresh cache
 *         example: false
 *     responses:
 *       200:
 *         description: Seller information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SellerResponse'
 *       400:
 *         description: Bad request - Invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Missing API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Invalid API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Seller not found or sellers.json not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:domain/seller/:sellerId', validateApiKeyOrExtension, getSellerById);

export default router;
