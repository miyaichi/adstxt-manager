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
      requesterToken,
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
    role?: TokenRole;
  } {
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

  /**
   * Generate a secure email verification token
   * @param email - The email address to verify
   * @returns A secure token for email verification
   */
  generateEmailVerificationToken(email: string): string {
    console.log(`Generating secure email verification token for ${email}`);
    
    // 1. メールアドレスを正規化 (小文字化、余分なスペース削除)
    const normalizedEmail = email.toLowerCase().trim();
    
    // 2. 有効期限を設定 (設定ファイルから取得)
    const expiryTime = Date.now() + config.security.emailVerificationExpiry;
    
    // 3. 署名対象データを生成 (メールアドレス + 有効期限 + 秘密キー)
    const data = `${normalizedEmail}:${expiryTime}:${config.security.jwtSecret}`;
    
    // 4. HMAC-SHA256でメッセージ認証コード(MAC)を生成
    const hmac = crypto.createHmac('sha256', config.security.jwtSecret);
    hmac.update(data);
    const digest = hmac.digest('hex');
    
    // 5. 有効期限と署名を組み合わせてトークンを形成
    // 有効期限は基数36で表現して短くする
    const token = `${expiryTime.toString(36)}.${digest}`;
    
    console.log(`Generated token for ${normalizedEmail}, expires: ${new Date(expiryTime).toISOString()}`);
    return token;
  }

  /**
   * Verify an email verification token
   * @param email - The email address to verify
   * @param token - The token to verify
   * @returns Boolean indicating if the token is valid
   */
  verifyEmailToken(email: string, token: string): boolean {
    console.log(`Verifying secure email token for ${email}`);
    
    try {
      // 1. トークンのフォーマットを検証 (期限.署名の形式か)
      const parts = token.split('.');
      if (parts.length !== 2) {
        console.log('Invalid token format: parts mismatch');
        return false;
      }
      
      // 2. 有効期限を解析
      const expiryTime = parseInt(parts[0], 36);
      if (isNaN(expiryTime)) {
        console.log('Invalid token format: expiry time not a number');
        return false;
      }
      
      // 3. 有効期限をチェック
      const now = Date.now();
      if (expiryTime < now) {
        console.log(`Token expired at ${new Date(expiryTime).toISOString()}, current time: ${new Date(now).toISOString()}`);
        return false;
      }
      
      // 4. メールアドレスを正規化
      const normalizedEmail = email.toLowerCase().trim();
      
      // 5. 署名の検証に必要なデータを再構成
      const data = `${normalizedEmail}:${expiryTime}:${config.security.jwtSecret}`;
      
      // 6. 期待される署名を計算
      const hmac = crypto.createHmac('sha256', config.security.jwtSecret);
      hmac.update(data);
      const expectedDigest = hmac.digest('hex');
      
      // 7. 受け取った署名と期待される署名を比較
      const receivedDigest = parts[1];
      const isValid = expectedDigest === receivedDigest;
      
      console.log(`Token validation result: ${isValid ? 'valid' : 'invalid'}`);
      if (!isValid) {
        console.log('Signature verification failed');
      }
      
      return isValid;
    } catch (error) {
      console.error('Error verifying email token:', error);
      return false;
    }
  }
}

export default new TokenService();
