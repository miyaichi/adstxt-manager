import {
  isValidDomain,
  isValidEmail,
  parseAdsTxtContent,
  parseAdsTxtLine
} from './validation';

// Standalone test file for validation utilities
describe('Validation Utils', () => {
  describe('Email Validation', () => {
    it('should validate correct email addresses', () => {
      // Arrange
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user-name@domain.com'
      ];
      
      // Act & Assert
      validEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(true);
      });
    });
    
    it('should invalidate incorrect email addresses', () => {
      // Arrange
      const invalidEmails = [
        'test@',
        '@example.com',
        'test@.com',
        'test@com',
        'test@example.',
        'test with spaces@example.com',
        'test..two-dots@example.com',
        'test. .dots@example.com',
        'a @example.com'
      ];
      
      // Act & Assert
      invalidEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(false);
      });
    });
  });
  
  describe('Ads.txt Line Parsing', () => {
    it('should parse valid Ads.txt lines', () => {
      // Arrange
      const validLines = [
        'google.com, pub-1234567890, DIRECT',
        'adnetwork.com, abcd1234, RESELLER, f08c47fec0942fa0',
        'example.com, 12345, DIRECT, #This is a comment',
        'domain.com, ID123, RESELLER'
      ];
      
      // Act & Assert
      validLines.forEach((line, index) => {
        const parsed = parseAdsTxtLine(line, index + 1);
        expect(parsed).not.toBeNull();
        expect(parsed?.is_valid).toBe(true);
      });
    });
    
    it('should correctly identify invalid Ads.txt lines', () => {
      // Arrange
      const invalidLines = [
        'invalidformat', // No commas
        'domain, ID', // Missing account type
        'domain .com, ID, DIRECT', // Invalid domain with space
        'invalid domain.com, pub-1234, DIRECT' // Space in domain
      ];
      
      // Act & Assert
      invalidLines.forEach((line, index) => {
        const parsed = parseAdsTxtLine(line, index + 1);
        expect(parsed?.is_valid).toBe(false);
      });
    });
  });
});