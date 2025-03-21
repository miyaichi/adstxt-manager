import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import tokenService from '../services/tokenService';

export interface Request {
  id: string;
  publisher_email: string;
  requester_email: string;
  requester_name: string;
  publisher_name?: string;
  publisher_domain?: string;
  status: 'pending' | 'approved' | 'rejected' | 'updated';
  token: string;
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

class RequestModel {
  /**
   * Create a new request
   * @param requestData - The data for the new request
   * @returns Promise with the created request
   */
  create(requestData: CreateRequestDTO): Promise<Request> {
    return new Promise((resolve, reject) => {
      const id = uuidv4();
      const token = tokenService.generateToken(id, requestData.publisher_email);
      const now = new Date().toISOString();
      
      const request: Request = {
        id,
        publisher_email: requestData.publisher_email,
        requester_email: requestData.requester_email,
        requester_name: requestData.requester_name,
        publisher_name: requestData.publisher_name,
        publisher_domain: requestData.publisher_domain,
        status: 'pending',
        token,
        created_at: now,
        updated_at: now
      };

      const sql = `
        INSERT INTO requests 
        (id, publisher_email, requester_email, requester_name, publisher_name, 
         publisher_domain, status, token, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.run(
        sql,
        [
          request.id,
          request.publisher_email,
          request.requester_email,
          request.requester_name,
          request.publisher_name || null,
          request.publisher_domain || null,
          request.status,
          request.token,
          request.created_at,
          request.updated_at
        ],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(request);
        }
      );
    });
  }

  /**
   * Get a request by ID and verify token access
   * @param id - The request ID
   * @param token - The access token
   * @returns Promise with the request or null if not found/invalid token
   */
  getByIdWithToken(id: string, token: string): Promise<Request | null> {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM requests WHERE id = ?',
        [id],
        (err, row: Request) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (!row) {
            resolve(null);
            return;
          }

          if (!tokenService.verifyToken(token, row.token)) {
            resolve(null);
            return;
          }

          resolve(row);
        }
      );
    });
  }

  /**
   * Get a request by ID
   * @param id - The request ID
   * @returns Promise with the request or null if not found
   */
  getById(id: string): Promise<Request | null> {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM requests WHERE id = ?',
        [id],
        (err, row: Request) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (!row) {
            resolve(null);
            return;
          }

          resolve(row);
        }
      );
    });
  }

  /**
   * Update the status of a request
   * @param id - The request ID
   * @param status - The new status
   * @returns Promise with the updated request
   */
  updateStatus(id: string, status: 'pending' | 'approved' | 'rejected' | 'updated'): Promise<Request | null> {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      
      db.run(
        'UPDATE requests SET status = ?, updated_at = ? WHERE id = ?',
        [status, now, id],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          
          if (this.changes === 0) {
            resolve(null);
            return;
          }
          
          this.getById(id)
            .then(request => resolve(request))
            .catch(err => reject(err));
        }.bind(this)
      );
    });
  }

  /**
   * Update publisher information
   * @param id - The request ID
   * @param publisherName - The publisher name
   * @param publisherDomain - The publisher domain
   * @returns Promise with the updated request
   */
  updatePublisherInfo(id: string, publisherName: string, publisherDomain: string): Promise<Request | null> {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      
      db.run(
        'UPDATE requests SET publisher_name = ?, publisher_domain = ?, updated_at = ? WHERE id = ?',
        [publisherName, publisherDomain, now, id],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          
          if (this.changes === 0) {
            resolve(null);
            return;
          }
          
          this.getById(id)
            .then(request => resolve(request))
            .catch(err => reject(err));
        }.bind(this)
      );
    });
  }

  /**
   * Get all requests for a publisher email
   * @param email - The publisher email
   * @returns Promise with an array of requests
   */
  getByPublisherEmail(email: string): Promise<Request[]> {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM requests WHERE publisher_email = ? ORDER BY updated_at DESC',
        [email],
        (err, rows: Request[]) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(rows || []);
        }
      );
    });
  }

  /**
   * Get all requests for a requester email
   * @param email - The requester email
   * @returns Promise with an array of requests
   */
  getByRequesterEmail(email: string): Promise<Request[]> {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM requests WHERE requester_email = ? ORDER BY updated_at DESC',
        [email],
        (err, rows: Request[]) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(rows || []);
        }
      );
    });
  }
}

export default new RequestModel();