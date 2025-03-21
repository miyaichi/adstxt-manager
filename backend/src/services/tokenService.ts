import crypto from 'crypto';
import config from '../config/config';

/**
 * Service to generate and validate tokens
 */
class TokenService {
  /**
   * Generate a secure token for request access
   * @param requestId - The request ID to encode in the token
   * @param email - The email address associated with the token
   * @returns A secure SHA256 hash token
   */
  generateToken(requestId: string, email: string): string {
    const timestamp = Date.now().toString();
    const data = `${requestId}:${email}:${timestamp}:${config.security.tokenSecret}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verify if a token is valid for a given request
   * @param token - The token to verify
   * @param storedToken - The token stored in the database
   * @returns Boolean indicating if the token is valid
   */
  verifyToken(token: string, storedToken: string): boolean {
    // Simple comparison for now - could add more complex validation if needed
    return token === storedToken;
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