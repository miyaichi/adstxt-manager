import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { ApiRequest } from '../models/request.model';

/**
 * Stub controller for request-related endpoints
 */
export const requestController = {
  /**
   * Create a new request (stub implementation)
   */
  create: async (req: Request, res: Response) => {
    // Validate request input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors.array(),
        },
      });
    }

    try {
      // Extract request data
      const { domain, email, changes } = req.body;

      // In a real implementation, this would save to the database
      // For the stub, we'll just return a mock response with a generated ID
      const requestId = uuidv4();
      const now = new Date().toISOString();

      // Create a mock request object
      const mockRequest: ApiRequest = {
        id: requestId,
        domain,
        email,
        changes,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      };

      // Return successful response with mock data
      return res.status(201).json({
        success: true,
        data: mockRequest,
      });
    } catch (error) {
      console.error('Error creating request:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'An unexpected error occurred',
        },
      });
    }
  },

  /**
   * Get a request by ID (stub implementation)
   */
  getById: async (req: Request, res: Response) => {
    // Validate request input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors.array(),
        },
      });
    }

    try {
      const { id } = req.params;

      // In a real implementation, this would query the database
      // For the stub, we'll just return a mock response or 404

      // Simulate not found for specific test ID
      if (id === '00000000-0000-0000-0000-000000000000') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Request not found',
          },
        });
      }

      // Mock data for any other ID
      const mockRequest: ApiRequest = {
        id,
        domain: 'example.com',
        email: 'user@example.com',
        changes: 'Added new partner: google.com, pub-1234, DIRECT, f08c47fec0942fa0',
        status: 'pending',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };

      return res.status(200).json({
        success: true,
        data: mockRequest,
      });
    } catch (error) {
      console.error('Error fetching request:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'An unexpected error occurred',
        },
      });
    }
  },

  /**
   * List requests with pagination and filtering (stub implementation)
   */
  list: async (req: Request, res: Response) => {
    // Validate request input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors.array(),
        },
      });
    }

    try {
      // Extract query parameters with defaults
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;
      const domain = req.query.domain as string;
      const status = req.query.status as string;

      // Generate mock data for demonstration
      const mockRequests: ApiRequest[] = [];
      const total = 23; // Mock total count

      // Generate some sample data based on the limit
      for (let i = 0; i < Math.min(limit, total - offset); i++) {
        if (offset + i >= total) break;

        const statusOptions: ('pending' | 'approved' | 'rejected')[] = [
          'pending',
          'approved',
          'rejected',
        ];
        const mockRequest: ApiRequest = {
          id: uuidv4(),
          domain: domain || `domain-${i + offset}.com`,
          email: `user-${i + offset}@example.com`,
          changes: `Sample changes for request ${i + offset}`,
          status: (status as 'pending' | 'approved' | 'rejected') || statusOptions[i % 3],
          createdAt: new Date(Date.now() - i * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - i * 86400000).toISOString(),
        };

        mockRequests.push(mockRequest);
      }

      // Return paginated response
      return res.status(200).json({
        success: true,
        data: mockRequests,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      });
    } catch (error) {
      console.error('Error listing requests:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'An unexpected error occurred',
        },
      });
    }
  },
};
