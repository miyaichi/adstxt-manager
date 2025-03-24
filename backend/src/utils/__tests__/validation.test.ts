import {
  isValidEmail,
  parseAdsTxtContent,
  parseAdsTxtLine,
  crossCheckAdsTxtRecords,
} from '../validation';

describe('Validation Utilities', () => {
  describe('Email Validation', () => {
    it('should validate correct email addresses', () => {
      // Arrange
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user-name@domain.com',
      ];

      // Act & Assert
      validEmails.forEach((email) => {
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
      ];

      // Act & Assert
      invalidEmails.forEach((email) => {
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
        'domain.com, ID123, RESELLER',
      ];

      // Act & Assert
      validLines.forEach((line, index) => {
        const parsed = parseAdsTxtLine(line, index + 1);
        expect(parsed).not.toBeNull();
        expect(parsed?.is_valid).toBe(true);
      });
    });

    it('should identify invalid Ads.txt lines', () => {
      // Arrange
      const invalidLines = [
        'google.com', // Missing fields
        'domain, ID', // Missing account type
        'domain .com, ID, DIRECT', // Invalid domain with space
        'sub.example.com, 12345, DIRECT', // Subdomain instead of root domain
        'www.google.com, 12345, DIRECT', // Subdomain instead of root domain
      ];

      // Act & Assert
      invalidLines.forEach((line, index) => {
        const parsed = parseAdsTxtLine(line, index + 1);
        expect(parsed?.is_valid).toBe(false);
      });
    });

    it('should ignore comments and empty lines', () => {
      // Arrange
      const comments = ['# This is a comment', '   # Indented comment', ''];

      // Act & Assert
      comments.forEach((line, index) => {
        const parsed = parseAdsTxtLine(line, index + 1);
        expect(parsed).toBeNull();
      });
    });

    it('should extract all components correctly', () => {
      // Arrange
      const line = 'adnetwork.com, abcd1234, RESELLER, f08c47fec0942fa0';

      // Act
      const parsed = parseAdsTxtLine(line, 1);

      // Assert
      expect(parsed).not.toBeNull();
      expect(parsed?.domain).toBe('adnetwork.com');
      expect(parsed?.account_id).toBe('abcd1234');
      expect(parsed?.account_type).toBe('RESELLER');
      expect(parsed?.relationship).toBe('RESELLER');
      expect(parsed?.certification_authority_id).toBe('f08c47fec0942fa0');
      expect(parsed?.line_number).toBe(1);
      expect(parsed?.raw_line).toBe(line);
      expect(parsed?.is_valid).toBe(true);
    });
  });

  describe('Ads.txt Content Parsing', () => {
    it('should parse a complete Ads.txt file', () => {
      // Arrange
      const content = `# Ads.txt for example.com
google.com, pub-1234567890, DIRECT
adnetwork.com, abcd1234, RESELLER, f08c47fec0942fa0

# Partners
partner1.com, 12345, DIRECT
partner2.com, 67890, RESELLER`;

      // Act
      const records = parseAdsTxtContent(content);

      // Assert
      expect(records.length).toBe(4); // Should ignore the comments and empty line
      expect(records[0].domain).toBe('google.com');
      expect(records[1].domain).toBe('adnetwork.com');
      expect(records[2].domain).toBe('partner1.com');
      expect(records[3].domain).toBe('partner2.com');
      expect(records.every((r) => r.is_valid)).toBe(true);
    });

    it('should handle mixed valid and invalid lines', () => {
      // Arrange
      const content = `valid.com, 12345, DIRECT
invalid.com
another.com, 67890, RESELLER`;

      // Act
      const records = parseAdsTxtContent(content);

      // Assert
      expect(records.length).toBe(3);
      expect(records[0].is_valid).toBe(true);
      expect(records[1].is_valid).toBe(false);
      expect(records[2].is_valid).toBe(true);
    });
  });

  describe('Ads.txt Cross-Check', () => {
    // Testing the basic functionality without mocking the database
    it('should handle undefined publisher domain', async () => {
      // Arrange
      const records = [
        {
          domain: 'google.com',
          account_id: '12345',
          account_type: 'DIRECT',
          relationship: 'DIRECT' as 'DIRECT',
          line_number: 1,
          raw_line: 'google.com, 12345, DIRECT',
          is_valid: true,
        },
      ];

      // Act
      const result = await crossCheckAdsTxtRecords(undefined, records);

      // Assert
      expect(result).toEqual(records); // Use toEqual instead of toBe
      expect(result.length).toBe(1);
    });

    // Note: For complete testing of the crossCheckAdsTxtRecords function,
    // integration tests with a test database would be more appropriate
    // due to the database interactions and dynamic module imports.
  });
});
