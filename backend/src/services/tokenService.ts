import crypto from 'crypto';
import config from '../config/config';

/**
 * Role type for token generation
 */
export type TokenRole = 'publisher' | 'requester';

/**
 * Token information including role
 */
export interface TokenInfo {
  token: string;
  role: TokenRole;
}

/**
 * Service to generate and validate tokens
 */
class TokenService {
  /**
   * Generate a secure token for request access
   * @param requestId - The request ID to encode in the token
   * @param email - The email address associated with the token
   * @param role - Optional role for the token (backward compatibility)
   * @returns A secure SHA256 hash token
   * @deprecated Use generateRoleToken instead
   */
  generateToken(requestId: string, email: string, role?: TokenRole): string {
    const timestamp = Date.now().toString();
    const roleData = role ? `:${role}` : '';
    const data = `${requestId}:${email}${roleData}:${timestamp}:${config.security.tokenSecret}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate a token for a specific role
   * @param requestId - The request ID to encode in the token
   * @param email - The email address associated with the token
   * @param role - The role associated with the token (publisher or requester)
   * @returns A secure SHA256 hash token with embedded role information
   */
  generateRoleToken(requestId: string, email: string, role: TokenRole): string {
    const timestamp = Date.now().toString();
    const data = `${requestId}:${email}:${role}:${timestamp}:${config.security.tokenSecret}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate both publisher and requester tokens for a request
   * @param requestId - The request ID
   * @param publisherEmail - The publisher's email
   * @param requesterEmail - The requester's email
   * @returns Object containing both tokens
   */
  generateRequestTokens(
    requestId: string, 
    publisherEmail: string, 
    requesterEmail: string
  ): {
    publisherToken: string;
    requesterToken: string;
  } {
    const publisherToken = this.generateRoleToken(requestId, publisherEmail, 'publisher');
    const requesterToken = this.generateRoleToken(requestId, requesterEmail, 'requester');
    
    return {
      publisherToken,
      requesterToken
    };
  }

  /**
   * Verify if a token is valid for a given request
   * @param token - The token to verify
   * @param storedTokens - The tokens stored in the database (publisher and/or requester)
   * @returns Object with validity and role if valid
   */
  verifyToken(
    token: string, 
    storedTokens: { publisherToken?: string; requesterToken?: string; token?: string }
  ): { 
    isValid: boolean; 
    role?: TokenRole 
  } {
    // Check for legacy token (backward compatibility)
    if (storedTokens.token && token === storedTokens.token) {
      return { isValid: true };
    }
    
    // Check publisher token
    if (storedTokens.publisherToken && token === storedTokens.publisherToken) {
      return { isValid: true, role: 'publisher' };
    }
    
    // Check requester token
    if (storedTokens.requesterToken && token === storedTokens.requesterToken) {
      return { isValid: true, role: 'requester' };
    }
    
    // No match found
    return { isValid: false };
  }

  /**
   * Generate a unique request ID
   * @returns A unique UUID-like string
   */
  generateRequestId(): string {
    return crypto.randomUUID();
  }
}

export default new TokenService();
