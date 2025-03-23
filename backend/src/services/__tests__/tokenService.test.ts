import tokenService from '../../services/tokenService';
import config from '../../config/config';
import crypto from 'crypto';

// Mock crypto module
jest.mock('crypto', () => ({
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnValue({
      digest: jest.fn().mockReturnValue('mocked-token-hash'),
    }),
  }),
  randomUUID: jest.fn().mockReturnValue('mocked-uuid'),
}));

describe('TokenService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateToken', () => {
    it('should generate a token using the correct parameters', () => {
      // Arrange
      const requestId = 'request-123';
      const email = 'user@example.com';

      // Mock Date.now to return a consistent timestamp for testing
      const originalDateNow = Date.now;
      const mockTimestamp = 1615000000000;
      Date.now = jest.fn(() => mockTimestamp);

      // Act
      const token = tokenService.generateToken(requestId, email);

      // Assert
      expect(crypto.createHash).toHaveBeenCalledWith('sha256');

      const updateMock = crypto.createHash('sha256').update;
      expect(updateMock).toHaveBeenCalledWith(
        `${requestId}:${email}:${mockTimestamp}:${config.security.tokenSecret}`
      );

      const digestMock = updateMock('').digest;
      expect(digestMock).toHaveBeenCalledWith('hex');

      expect(token).toBe('mocked-token-hash');

      // Restore original Date.now
      Date.now = originalDateNow;
    });
  });

  describe('verifyToken', () => {
    it('should return true when tokens match', () => {
      // Arrange
      const token = 'valid-token-123';
      const storedToken = 'valid-token-123';

      // Act
      const result = tokenService.verifyToken(token, storedToken);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when tokens do not match', () => {
      // Arrange
      const token = 'invalid-token-123';
      const storedToken = 'valid-token-123';

      // Act
      const result = tokenService.verifyToken(token, storedToken);

      // Assert
      expect(result).toBe(false);
    });

    it('should handle undefined or null tokens properly', () => {
      // Act & Assert
      expect(tokenService.verifyToken('', '')).toBe(true);
      expect(tokenService.verifyToken('token', '')).toBe(false);
      expect(tokenService.verifyToken('', 'token')).toBe(false);
    });
  });

  describe('generateRequestId', () => {
    it('should generate a request ID using crypto.randomUUID', () => {
      // Act
      const requestId = tokenService.generateRequestId();

      // Assert
      expect(crypto.randomUUID).toHaveBeenCalledTimes(1);
      expect(requestId).toBe('mocked-uuid');
    });
  });
});
