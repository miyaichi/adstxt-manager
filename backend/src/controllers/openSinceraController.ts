import { Request, Response } from 'express';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import openSinceraService, { GetPublisherMetadataRequest } from '../services/openSinceraService';
import { createLogger } from '../utils/logger';

const logger = createLogger('OpenSinceraController');

/**
 * Get publisher metadata from OpenSincera API
 * @route GET /api/opensincera/publishers/metadata
 */
export const getPublisherMetadata = asyncHandler(async (req: Request, res: Response) => {
  const { publisherId, publisherDomain, limit, offset, includeInactive } = req.query;

  if (!publisherId && !publisherDomain) {
    throw new ApiError(400, 'Either publisherId or publisherDomain is required', 'MISSING_PARAMETER');
  }

  const request: GetPublisherMetadataRequest = {};

  if (publisherId) {
    request.publisherId = publisherId as string;
  }

  if (publisherDomain) {
    request.publisherDomain = publisherDomain as string;
  }

  if (limit) {
    const limitNum = parseInt(limit as string, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      throw new ApiError(400, 'Limit must be a number between 1 and 1000', 'INVALID_PARAMETER');
    }
    request.limit = limitNum;
  }

  if (offset) {
    const offsetNum = parseInt(offset as string, 10);
    if (isNaN(offsetNum) || offsetNum < 0) {
      throw new ApiError(400, 'Offset must be a non-negative number', 'INVALID_PARAMETER');
    }
    request.offset = offsetNum;
  }

  if (includeInactive !== undefined) {
    request.includeInactive = includeInactive === 'true';
  }

  try {
    logger.info('Fetching publisher metadata from OpenSincera API', request);
    const result = await openSinceraService.getPublisherMetadata(request);
    
    logger.info('Successfully fetched publisher metadata', {
      publisherCount: result.publishers.length,
      totalCount: result.totalCount,
      hasMore: result.hasMore,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to fetch publisher metadata', {
      error: errorMessage,
      request,
    });

    if (errorMessage.includes('Invalid API key')) {
      throw new ApiError(401, 'OpenSincera API authentication failed', 'AUTHENTICATION_ERROR');
    }

    if (errorMessage.includes('Rate limit exceeded')) {
      throw new ApiError(429, 'OpenSincera API rate limit exceeded', 'RATE_LIMIT_EXCEEDED');
    }

    if (errorMessage.includes('Publisher not found')) {
      throw new ApiError(404, 'Publisher not found', 'PUBLISHER_NOT_FOUND');
    }

    throw new ApiError(500, 'Failed to fetch publisher metadata', 'EXTERNAL_API_ERROR');
  }
});

/**
 * Get publisher metadata by domain
 * @route GET /api/opensincera/publishers/domain/:domain
 */
export const getPublisherByDomain = asyncHandler(async (req: Request, res: Response) => {
  const { domain } = req.params;

  if (!domain) {
    throw new ApiError(400, 'Domain parameter is required', 'MISSING_PARAMETER');
  }

  // Basic domain validation
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
  if (!domainRegex.test(domain)) {
    throw new ApiError(400, 'Invalid domain format', 'INVALID_DOMAIN_FORMAT');
  }

  try {
    logger.info('Fetching publisher metadata by domain', { domain });
    const publisher = await openSinceraService.getPublisherByDomain(domain);
    
    if (!publisher) {
      throw new ApiError(404, 'Publisher not found for domain', 'PUBLISHER_NOT_FOUND');
    }

    logger.info('Successfully fetched publisher by domain', {
      domain,
      publisherId: publisher.publisherId,
    });

    res.json({
      success: true,
      data: publisher,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to fetch publisher by domain', {
      error: errorMessage,
      domain,
    });

    if (error instanceof ApiError) {
      throw error;
    }

    if (errorMessage.includes('Invalid API key')) {
      throw new ApiError(401, 'OpenSincera API authentication failed', 'AUTHENTICATION_ERROR');
    }

    if (errorMessage.includes('Rate limit exceeded')) {
      throw new ApiError(429, 'OpenSincera API rate limit exceeded', 'RATE_LIMIT_EXCEEDED');
    }

    throw new ApiError(500, 'Failed to fetch publisher by domain', 'EXTERNAL_API_ERROR');
  }
});

/**
 * Get publisher metadata by ID
 * @route GET /api/opensincera/publishers/:publisherId
 */
export const getPublisherById = asyncHandler(async (req: Request, res: Response) => {
  const { publisherId } = req.params;

  if (!publisherId) {
    throw new ApiError(400, 'Publisher ID parameter is required', 'MISSING_PARAMETER');
  }

  try {
    logger.info('Fetching publisher metadata by ID', { publisherId });
    const publisher = await openSinceraService.getPublisherById(publisherId);
    
    if (!publisher) {
      throw new ApiError(404, 'Publisher not found', 'PUBLISHER_NOT_FOUND');
    }

    logger.info('Successfully fetched publisher by ID', {
      publisherId,
      publisherDomain: publisher.publisherDomain,
    });

    res.json({
      success: true,
      data: publisher,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to fetch publisher by ID', {
      error: errorMessage,
      publisherId,
    });

    if (error instanceof ApiError) {
      throw error;
    }

    if (errorMessage.includes('Invalid API key')) {
      throw new ApiError(401, 'OpenSincera API authentication failed', 'AUTHENTICATION_ERROR');
    }

    if (errorMessage.includes('Rate limit exceeded')) {
      throw new ApiError(429, 'OpenSincera API rate limit exceeded', 'RATE_LIMIT_EXCEEDED');
    }

    throw new ApiError(500, 'Failed to fetch publisher by ID', 'EXTERNAL_API_ERROR');
  }
});

/**
 * Health check for OpenSincera API connection
 * @route GET /api/opensincera/health
 */
export const healthCheck = asyncHandler(async (req: Request, res: Response) => {
  try {
    logger.info('Performing OpenSincera API health check');
    const isHealthy = await openSinceraService.healthCheck();
    
    res.json({
      success: true,
      data: {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('OpenSincera API health check failed', {
      error: errorMessage,
    });

    res.status(503).json({
      success: false,
      error: 'OpenSincera API health check failed',
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

export default {
  getPublisherMetadata,
  getPublisherByDomain,
  getPublisherById,
  healthCheck,
};