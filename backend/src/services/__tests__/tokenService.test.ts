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

  // Legacy generateToken test removed as the method has been deprecated

  describe('verifyToken', () => {
    it('should return isValid=true and role=publisher when publisher token matches', () => {
      // Arrange
      const token = 'valid-publisher-token';
      const storedTokens = {
        publisherToken: 'valid-publisher-token',
        requesterToken: 'requester-token'
      };

      // Act
      const result = tokenService.verifyToken(token, storedTokens);

      // Assert
      expect(result).toEqual({ isValid: true, role: 'publisher' });
    });

    it('should return isValid=true and role=requester when requester token matches', () => {
      // Arrange
      const token = 'valid-requester-token';
      const storedTokens = {
        publisherToken: 'publisher-token',
        requesterToken: 'valid-requester-token'
      };

      // Act
      const result = tokenService.verifyToken(token, storedTokens);

      // Assert
      expect(result).toEqual({ isValid: true, role: 'requester' });
    });

    it('should return isValid=false when no tokens match', () => {
      // Arrange
      const token = 'invalid-token';
      const storedTokens = {
        publisherToken: 'publisher-token',
        requesterToken: 'requester-token'
      };

      // Act
      const result = tokenService.verifyToken(token, storedTokens);

      // Assert
      expect(result).toEqual({ isValid: false });
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
