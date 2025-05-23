import { v4 as uuidv4 } from 'uuid';
import db from '../config/database/index';
import tokenService from '../services/tokenService';
import { DatabaseRecord, IDatabaseAdapter } from '../config/database/index';

export interface Request extends DatabaseRecord {
  id: string;
  publisher_email: string;
  requester_email: string;
  requester_name: string;
  publisher_name?: string;
  publisher_domain?: string;
  status: 'pending' | 'approved' | 'rejected' | 'updated';
  publisher_token?: string; // Publisher-specific token
  requester_token?: string; // Requester-specific token
  created_at: string;
  updated_at: string;
}

export interface CreateRequestDTO {
  publisher_email: string;
  requester_email: string;
  requester_name: string;
  publisher_name?: string;
  publisher_domain?: string;
}

// Use the exported database instance, which implements IDatabaseAdapter
// No need for type assertion since it's already typed correctly

class RequestModel {
  private readonly tableName = 'requests';

  /**
   * Create a new request
   * @param requestData - The data for the new request
   * @returns Promise with the created request
   */
  async create(requestData: CreateRequestDTO): Promise<Request> {
    const id = uuidv4();
    const tokens = tokenService.generateRequestTokens(
      id,
      requestData.publisher_email,
      requestData.requester_email
    );

    const now = new Date().toISOString();

    const request: Request = {
      id,
      publisher_email: requestData.publisher_email,
      requester_email: requestData.requester_email,
      requester_name: requestData.requester_name,
      publisher_name: requestData.publisher_name,
      publisher_domain: requestData.publisher_domain,
      status: 'pending',
      publisher_token: tokens.publisherToken,
      requester_token: tokens.requesterToken,
      created_at: now,
      updated_at: now,
    };

    return await db.insert(this.tableName, request);
  }

  /**
   * Get a request by ID and verify token access
   * @param id - The request ID
   * @param token - The access token
   * @returns Promise with the request and role info if found/valid token
   */
  async getByIdWithToken(
    id: string,
    token: string
  ): Promise<{ request: Request; role?: 'publisher' | 'requester' } | null> {
    const request = await db.getById<Request>(this.tableName, id);

    if (!request) {
      return null;
    }

    // Verify token using role-based tokens only
    const tokenVerification = tokenService.verifyToken(token, {
      publisherToken: request.publisher_token,
      requesterToken: request.requester_token,
    });

    if (!tokenVerification.isValid) {
      return null;
    }

    return {
      request,
      role: tokenVerification.role,
    };
  }

  /**
   * Get a request by ID
   * @param id - The request ID
   * @returns Promise with the request or null if not found
   */
  async getById(id: string): Promise<Request | null> {
    return await db.getById(this.tableName, id);
  }

  /**
   * Update the status of a request
   * @param id - The request ID
   * @param status - The new status
   * @returns Promise with the updated request
   */
  async updateStatus(
    id: string,
    status: 'pending' | 'approved' | 'rejected' | 'updated'
  ): Promise<Request | null> {
    const now = new Date().toISOString();

    return (await db.update(this.tableName, id, {
      status,
      updated_at: now,
    })) as Request | null;
  }

  /**
   * Update publisher information
   * @param id - The request ID
   * @param publisherName - The publisher name
   * @param publisherDomain - The publisher domain
   * @returns Promise with the updated request
   */
  async updatePublisherInfo(
    id: string,
    publisherName: string,
    publisherDomain: string
  ): Promise<Request | null> {
    const now = new Date().toISOString();

    return (await db.update(this.tableName, id, {
      publisher_name: publisherName,
      publisher_domain: publisherDomain,
      updated_at: now,
    })) as Request | null;
  }

  /**
   * Get all requests for a publisher email
   * @param email - The publisher email
   * @returns Promise with an array of requests
   */
  async getByPublisherEmail(email: string): Promise<Request[]> {
    return await db.query(this.tableName, {
      where: { publisher_email: email },
      order: { field: 'updated_at', direction: 'DESC' },
    });
  }

  /**
   * Get all requests for a requester email
   * @param email - The requester email
   * @returns Promise with an array of requests
   */
  async getByRequesterEmail(email: string): Promise<Request[]> {
    return await db.query(this.tableName, {
      where: { requester_email: email },
      order: { field: 'updated_at', direction: 'DESC' },
    });
  }

  /**
   * Update a request with new data
   * @param id - The request ID
   * @param requestData - Updated request data
   * @returns Promise with the updated request
   */
  async update(id: string, requestData: Partial<CreateRequestDTO>): Promise<Request | null> {
    const now = new Date().toISOString();

    const updateData: Partial<Request> = {
      ...requestData,
      updated_at: now,
    };

    return (await db.update(this.tableName, id, updateData)) as Request | null;
  }
}

export default new RequestModel();
