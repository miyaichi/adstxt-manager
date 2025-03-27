import {
  isValidEmail,
  parseAdsTxtContent,
  parseAdsTxtLine,
  crossCheckAdsTxtRecords,
  ParsedAdsTxtRecord,
  ERROR_KEYS,
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

    it('should identify invalid Ads.txt lines with proper error keys', () => {
      // Arrange and expected results
      const testCases = [
        { line: 'google.com', expectedError: ERROR_KEYS.MISSING_FIELDS },
        { line: 'domain, ID', expectedError: ERROR_KEYS.MISSING_FIELDS },
        { line: 'domain .com, ID, DIRECT', expectedError: ERROR_KEYS.INVALID_ROOT_DOMAIN },
        { line: 'sub.example.com, 12345, DIRECT', expectedError: ERROR_KEYS.INVALID_ROOT_DOMAIN },
        { line: 'example.com, , DIRECT', expectedError: ERROR_KEYS.EMPTY_ACCOUNT_ID },
        { line: 'example.com, 12345, WRONG', expectedError: ERROR_KEYS.INVALID_RELATIONSHIP },
        // Misspelled relationship detection is now handled in a different way
        // Using explicit "DIRECT" or "RESELLER" similarity check
        { line: 'example.com, 12345, DIRECR', expectedError: ERROR_KEYS.INVALID_RELATIONSHIP },
      ];

      // Act & Assert
      testCases.forEach((testCase, index) => {
        const parsed = parseAdsTxtLine(testCase.line, index + 1);
        expect(parsed?.is_valid).toBe(false);
        expect(parsed?.error).toBe(testCase.expectedError);
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

    it('should handle different relationship format variants', () => {
      // Arrange
      const testCases = [
        // Format: domain, id, non-relationship, relationship
        { line: 'example.com, 12345, xyz, DIRECT', expectedRelationship: 'DIRECT' },
        // Format: domain, id, non-relationship, relationship, cert
        {
          line: 'example.com, 12345, xyz, RESELLER, abc123',
          expectedRelationship: 'RESELLER',
          expectedCert: 'abc123',
        },
        // Format: domain, id, relationship
        { line: 'example.com, 12345, DIRECT', expectedRelationship: 'DIRECT' },
        // Format: domain, id, relationship, cert
        {
          line: 'example.com, 12345, RESELLER, def456',
          expectedRelationship: 'RESELLER',
          expectedCert: 'def456',
        },
      ];

      // Act & Assert
      testCases.forEach((testCase, index) => {
        const parsed = parseAdsTxtLine(testCase.line, index + 1);
        expect(parsed?.is_valid).toBe(true);
        expect(parsed?.relationship).toBe(testCase.expectedRelationship);
        if (testCase.expectedCert) {
          expect(parsed?.certification_authority_id).toBe(testCase.expectedCert);
        }
      });
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
    // Mock imports for testing
    jest.mock('../../models/AdsTxtCache', () => {
      return { __esModule: true, default: require('../../__tests__/mocks/adsTxtCache').default };
    });

    jest.mock('../../models/SellersJsonCache', () => {
      return {
        __esModule: true,
        default: require('../../__tests__/mocks/sellersJsonCache').default,
      };
    });

    // Import mocks after declaring jest.mock
    const AdsTxtCacheMock = require('../../__tests__/mocks/adsTxtCache').default;
    const SellersJsonCacheMock = require('../../__tests__/mocks/sellersJsonCache').default;

    // Reset mocks between tests
    beforeEach(() => {
      jest.clearAllMocks();
      jest.spyOn(console, 'log').mockImplementation(); // Suppress console.log in tests
      jest.spyOn(console, 'error').mockImplementation(); // Suppress console.error in tests
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    // Testing the basic functionality without mocking the database
    it('should handle undefined publisher domain', async () => {
      // Arrange
      const records: ParsedAdsTxtRecord[] = [
        {
          domain: 'google.com',
          account_id: '12345',
          account_type: 'DIRECT',
          relationship: 'DIRECT',
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

    // This test needs to be implemented with proper test doubles
    // The challenge is to mock the imports properly and test checkForDuplicates in isolation
    it.skip('should detect duplicate ads.txt entries', async () => {
      // TODO: Implement this test with proper test doubles
      // Specifically:
      // 1. Mock AdsTxtCacheModel to return a specific ads.txt content
      // 2. Create an input record that duplicates an entry in the cached content
      // 3. Verify the duplicate warning is correctly applied
    });

    // This test needs to be implemented with proper test doubles
    // The challenge is to mock the imports properly and test case-insensitivity
    it.skip('should detect case-insensitive duplicate ads.txt entries', async () => {
      // TODO: Implement this test with proper test doubles
      // Specifically:
      // 1. Mock AdsTxtCacheModel to return ads.txt content with lowercase domains
      // 2. Create an input record with the same domain but different case
      // 3. Verify the case-insensitive duplicate warning is correctly applied
    });

    it('should validate DIRECT entries against sellers.json', async () => {
      // Arrange
      const publisherDomain = 'publisher.com';
      const records: ParsedAdsTxtRecord[] = [
        {
          domain: 'openx.com',
          account_id: '541058490',
          account_type: 'DIRECT',
          relationship: 'DIRECT',
          line_number: 1,
          raw_line: 'openx.com, 541058490, DIRECT',
          is_valid: true,
        },
      ];

      // Setup mock AdsTxtCache - no duplicates
      AdsTxtCacheMock.getByDomain.mockResolvedValue({
        status: 'success',
        content: 'otherdomain.com, 67890, DIRECT',
      });

      // Setup mock SellersJsonCache
      SellersJsonCacheMock.getByDomain.mockResolvedValue({
        status: 'success',
        content: JSON.stringify({
          sellers: [
            {
              seller_id: '541058490',
              name: 'Test Publisher',
              domain: 'publisher.com',
              seller_type: 'PUBLISHER',
            },
          ],
        }),
      });

      SellersJsonCacheMock.parseContent.mockImplementation((content) => {
        return JSON.parse(content);
      });

      // Act
      const result = await crossCheckAdsTxtRecords(publisherDomain, records);

      // Assert
      expect(result[0].has_warning).toBeFalsy(); // No warnings for valid entry
      expect(result[0].validation_results).toBeDefined();
      if (result[0].validation_results) {
        expect(result[0].validation_results.hasSellerJson).toBe(true);
        expect(result[0].validation_results.accountIdInSellersJson).toBe(true);
        expect(result[0].validation_results.directEntryHasPublisherType).toBe(true);
        expect(result[0].validation_results.sellerIdIsUnique).toBe(true);
      }

      expect(SellersJsonCacheMock.getByDomain).toHaveBeenCalledWith('openx.com');
    });

    it('should validate RESELLER entries against sellers.json', async () => {
      // Arrange
      const publisherDomain = 'publisher.com';
      const records: ParsedAdsTxtRecord[] = [
        {
          domain: 'openx.com',
          account_id: '541058490',
          account_type: 'RESELLER',
          relationship: 'RESELLER',
          line_number: 1,
          raw_line: 'openx.com, 541058490, RESELLER',
          is_valid: true,
        },
      ];

      // Setup mock AdsTxtCache - no duplicates
      AdsTxtCacheMock.getByDomain.mockResolvedValue({
        status: 'success',
        content: 'otherdomain.com, 67890, DIRECT',
      });

      // Setup mock SellersJsonCache
      SellersJsonCacheMock.getByDomain.mockResolvedValue({
        status: 'success',
        content: JSON.stringify({
          sellers: [
            {
              seller_id: '541058490',
              name: 'Test Reseller',
              domain: 'reseller.com',
              seller_type: 'INTERMEDIARY',
            },
          ],
        }),
      });

      SellersJsonCacheMock.parseContent.mockImplementation((content) => {
        return JSON.parse(content);
      });

      // Act
      const result = await crossCheckAdsTxtRecords(publisherDomain, records);

      // Assert
      expect(result[0].has_warning).toBeFalsy(); // No warnings for valid entry
      expect(result[0].validation_results).toBeDefined();
      if (result[0].validation_results) {
        expect(result[0].validation_results.hasSellerJson).toBe(true);
        expect(result[0].validation_results.accountIdInSellersJson).toBe(true);
        expect(result[0].validation_results.resellerEntryHasIntermediaryType).toBe(true);
        expect(result[0].validation_results.resellerSellerIdIsUnique).toBe(true);
      }

      expect(SellersJsonCacheMock.getByDomain).toHaveBeenCalledWith('openx.com');
    });

    it('should detect missing sellers.json', async () => {
      // Arrange
      const publisherDomain = 'publisher.com';
      const records: ParsedAdsTxtRecord[] = [
        {
          domain: 'openx.com',
          account_id: '541058490',
          account_type: 'DIRECT',
          relationship: 'DIRECT',
          line_number: 1,
          raw_line: 'openx.com, 541058490, DIRECT',
          is_valid: true,
        },
      ];

      // Setup mock AdsTxtCache - no duplicates
      AdsTxtCacheMock.getByDomain.mockResolvedValue({
        status: 'success',
        content: 'otherdomain.com, 67890, DIRECT',
      });

      // Setup mock SellersJsonCache - missing or error
      SellersJsonCacheMock.getByDomain.mockResolvedValue({
        status: 'error',
        content: null,
      });

      // Act
      const result = await crossCheckAdsTxtRecords(publisherDomain, records);

      // Assert
      expect(result[0].has_warning).toBe(true);
      expect(result[0].warning).toBe(ERROR_KEYS.NO_SELLERS_JSON);
      expect(SellersJsonCacheMock.getByDomain).toHaveBeenCalledWith('openx.com');
    });

    it('should handle invalid sellers.json format', async () => {
      // Arrange
      const publisherDomain = 'publisher.com';
      const records: ParsedAdsTxtRecord[] = [
        {
          domain: 'openx.com',
          account_id: '541058490',
          account_type: 'DIRECT',
          relationship: 'DIRECT',
          line_number: 1,
          raw_line: 'openx.com, 541058490, DIRECT',
          is_valid: true,
        },
      ];

      // Setup mock AdsTxtCache - no duplicates
      AdsTxtCacheMock.getByDomain.mockResolvedValue({
        status: 'success',
        content: 'otherdomain.com, 67890, DIRECT',
      });

      // Setup mock SellersJsonCache - invalid format (no sellers array)
      SellersJsonCacheMock.getByDomain.mockResolvedValue({
        status: 'success',
        content: JSON.stringify({ name: 'Invalid Format' }),
      });

      SellersJsonCacheMock.parseContent.mockImplementation((content) => {
        return JSON.parse(content);
      });

      // Act
      const result = await crossCheckAdsTxtRecords(publisherDomain, records);

      // Assert
      expect(result[0].has_warning).toBe(true);
      expect(result[0].warning).toBe(ERROR_KEYS.NO_SELLERS_JSON);
      expect(SellersJsonCacheMock.getByDomain).toHaveBeenCalledWith('openx.com');
    });

    it('should detect account_id not found in sellers.json for DIRECT entries', async () => {
      // Arrange
      const publisherDomain = 'publisher.com';
      const records: ParsedAdsTxtRecord[] = [
        {
          domain: 'openx.com',
          account_id: '123456789', // Different from what's in sellers.json
          account_type: 'DIRECT',
          relationship: 'DIRECT',
          line_number: 1,
          raw_line: 'openx.com, 123456789, DIRECT',
          is_valid: true,
        },
      ];

      // Setup mock AdsTxtCache - no duplicates
      AdsTxtCacheMock.getByDomain.mockResolvedValue({
        status: 'success',
        content: 'otherdomain.com, 67890, DIRECT',
      });

      // Setup mock SellersJsonCache
      SellersJsonCacheMock.getByDomain.mockResolvedValue({
        status: 'success',
        content: JSON.stringify({
          sellers: [
            {
              seller_id: '541058490', // Different ID than in record
              name: 'Test Publisher',
              domain: 'publisher.com',
              seller_type: 'PUBLISHER',
            },
          ],
        }),
      });

      SellersJsonCacheMock.parseContent.mockImplementation((content) => {
        return JSON.parse(content);
      });

      // Act
      const result = await crossCheckAdsTxtRecords(publisherDomain, records);

      // Assert
      expect(result[0].has_warning).toBe(true);
      expect(result[0].warning).toBe(ERROR_KEYS.DIRECT_ACCOUNT_ID_NOT_IN_SELLERS_JSON);
      expect(result[0].warning_params).toEqual({
        domain: 'openx.com',
        account_id: '123456789',
      });
      expect(SellersJsonCacheMock.getByDomain).toHaveBeenCalledWith('openx.com');
    });

    it('should detect account_id not found in sellers.json for RESELLER entries', async () => {
      // Arrange
      const publisherDomain = 'publisher.com';
      const records: ParsedAdsTxtRecord[] = [
        {
          domain: 'openx.com',
          account_id: '123456789', // Different from what's in sellers.json
          account_type: 'RESELLER',
          relationship: 'RESELLER',
          line_number: 1,
          raw_line: 'openx.com, 123456789, RESELLER',
          is_valid: true,
        },
      ];

      // Setup mock AdsTxtCache - no duplicates
      AdsTxtCacheMock.getByDomain.mockResolvedValue({
        status: 'success',
        content: 'otherdomain.com, 67890, DIRECT',
      });

      // Setup mock SellersJsonCache
      SellersJsonCacheMock.getByDomain.mockResolvedValue({
        status: 'success',
        content: JSON.stringify({
          sellers: [
            {
              seller_id: '541058490', // Different ID than in record
              name: 'Test Reseller',
              domain: 'reseller.com',
              seller_type: 'INTERMEDIARY',
            },
          ],
        }),
      });

      SellersJsonCacheMock.parseContent.mockImplementation((content) => {
        return JSON.parse(content);
      });

      // Act
      const result = await crossCheckAdsTxtRecords(publisherDomain, records);

      // Assert
      expect(result[0].has_warning).toBe(true);
      expect(result[0].warning).toBe(ERROR_KEYS.RESELLER_ACCOUNT_ID_NOT_IN_SELLERS_JSON);
      expect(result[0].warning_params).toEqual({
        domain: 'openx.com',
        account_id: '123456789',
      });
      expect(SellersJsonCacheMock.getByDomain).toHaveBeenCalledWith('openx.com');
    });

    it('should detect DIRECT entry with incorrect seller_type', async () => {
      // Arrange
      const publisherDomain = 'publisher.com';
      const records: ParsedAdsTxtRecord[] = [
        {
          domain: 'openx.com',
          account_id: '541058490',
          account_type: 'DIRECT',
          relationship: 'DIRECT',
          line_number: 1,
          raw_line: 'openx.com, 541058490, DIRECT',
          is_valid: true,
        },
      ];

      // Setup mock AdsTxtCache - no duplicates
      AdsTxtCacheMock.getByDomain.mockResolvedValue({
        status: 'success',
        content: 'otherdomain.com, 67890, DIRECT',
      });

      // Setup mock SellersJsonCache
      SellersJsonCacheMock.getByDomain.mockResolvedValue({
        status: 'success',
        content: JSON.stringify({
          sellers: [
            {
              seller_id: '541058490',
              name: 'Test Publisher',
              domain: 'publisher.com',
              seller_type: 'INTERMEDIARY', // Wrong type for DIRECT
            },
          ],
        }),
      });

      SellersJsonCacheMock.parseContent.mockImplementation((content) => {
        return JSON.parse(content);
      });

      // Act
      const result = await crossCheckAdsTxtRecords(publisherDomain, records);

      // Assert
      expect(result[0].has_warning).toBe(true);
      expect(result[0].warning).toBe(ERROR_KEYS.DIRECT_NOT_PUBLISHER);
      expect(result[0].warning_params).toEqual({
        domain: 'openx.com',
        account_id: '541058490',
        seller_type: 'INTERMEDIARY',
      });
    });

    it('should detect RESELLER entry with incorrect seller_type', async () => {
      // Arrange
      const publisherDomain = 'publisher.com';
      const records: ParsedAdsTxtRecord[] = [
        {
          domain: 'openx.com',
          account_id: '541058490',
          account_type: 'RESELLER',
          relationship: 'RESELLER',
          line_number: 1,
          raw_line: 'openx.com, 541058490, RESELLER',
          is_valid: true,
        },
      ];

      // Setup mock AdsTxtCache - no duplicates
      AdsTxtCacheMock.getByDomain.mockResolvedValue({
        status: 'success',
        content: 'otherdomain.com, 67890, DIRECT',
      });

      // Setup mock SellersJsonCache
      SellersJsonCacheMock.getByDomain.mockResolvedValue({
        status: 'success',
        content: JSON.stringify({
          sellers: [
            {
              seller_id: '541058490',
              name: 'Test Publisher',
              domain: 'publisher.com',
              seller_type: 'PUBLISHER', // Wrong type for RESELLER
            },
          ],
        }),
      });

      SellersJsonCacheMock.parseContent.mockImplementation((content) => {
        return JSON.parse(content);
      });

      // Act
      const result = await crossCheckAdsTxtRecords(publisherDomain, records);

      // Assert
      expect(result[0].has_warning).toBe(true);
      expect(result[0].warning).toBe(ERROR_KEYS.RESELLER_NOT_INTERMEDIARY);
      expect(result[0].warning_params).toEqual({
        domain: 'openx.com',
        account_id: '541058490',
        seller_type: 'PUBLISHER',
      });
    });

    it('should detect domain mismatch in DIRECT entries', async () => {
      // Arrange
      const publisherDomain = 'publisher.com';
      const records: ParsedAdsTxtRecord[] = [
        {
          domain: 'openx.com',
          account_id: '541058490',
          account_type: 'DIRECT',
          relationship: 'DIRECT',
          line_number: 1,
          raw_line: 'openx.com, 541058490, DIRECT',
          is_valid: true,
        },
      ];

      // Setup mock AdsTxtCache - no duplicates
      AdsTxtCacheMock.getByDomain.mockResolvedValue({
        status: 'success',
        content: 'otherdomain.com, 67890, DIRECT',
      });

      // Setup mock SellersJsonCache
      SellersJsonCacheMock.getByDomain.mockResolvedValue({
        status: 'success',
        content: JSON.stringify({
          sellers: [
            {
              seller_id: '541058490',
              name: 'Test Publisher',
              domain: 'different-domain.com', // Different from publisherDomain
              seller_type: 'PUBLISHER',
            },
          ],
        }),
      });

      SellersJsonCacheMock.parseContent.mockImplementation((content) => {
        return JSON.parse(content);
      });

      // Act
      const result = await crossCheckAdsTxtRecords(publisherDomain, records);

      // Assert
      expect(result[0].has_warning).toBe(true);
      expect(result[0].warning).toBe(ERROR_KEYS.DOMAIN_MISMATCH);
      expect(result[0].warning_params).toEqual({
        domain: 'openx.com',
        publisher_domain: 'publisher.com',
        seller_domain: 'different-domain.com',
      });
    });

    it('should detect non-unique seller_id in sellers.json (DIRECT)', async () => {
      // Arrange
      const publisherDomain = 'publisher.com';
      const records: ParsedAdsTxtRecord[] = [
        {
          domain: 'openx.com',
          account_id: '541058490',
          account_type: 'DIRECT',
          relationship: 'DIRECT',
          line_number: 1,
          raw_line: 'openx.com, 541058490, DIRECT',
          is_valid: true,
        },
      ];

      // Setup mock AdsTxtCache - no duplicates
      AdsTxtCacheMock.getByDomain.mockResolvedValue({
        status: 'success',
        content: 'otherdomain.com, 67890, DIRECT',
      });

      // Setup mock SellersJsonCache with duplicate seller_ids
      SellersJsonCacheMock.getByDomain.mockResolvedValue({
        status: 'success',
        content: JSON.stringify({
          sellers: [
            {
              seller_id: '541058490', // Duplicate ID
              name: 'Test Publisher 1',
              domain: 'publisher.com',
              seller_type: 'PUBLISHER',
            },
            {
              seller_id: '541058490', // Duplicate ID
              name: 'Test Publisher 2',
              domain: 'another-domain.com',
              seller_type: 'PUBLISHER',
            },
          ],
        }),
      });

      SellersJsonCacheMock.parseContent.mockImplementation((content) => {
        return JSON.parse(content);
      });

      // Act
      const result = await crossCheckAdsTxtRecords(publisherDomain, records);

      // Assert
      expect(result[0].has_warning).toBe(true);
      expect(result[0].warning).toBe(ERROR_KEYS.SELLER_ID_NOT_UNIQUE);
      expect(result[0].warning_params).toEqual({
        domain: 'openx.com',
        account_id: '541058490',
      });
    });

    it('should detect non-unique seller_id in sellers.json (RESELLER)', async () => {
      // Arrange
      const publisherDomain = 'publisher.com';
      const records: ParsedAdsTxtRecord[] = [
        {
          domain: 'openx.com',
          account_id: '541058490',
          account_type: 'RESELLER',
          relationship: 'RESELLER',
          line_number: 1,
          raw_line: 'openx.com, 541058490, RESELLER',
          is_valid: true,
        },
      ];

      // Setup mock AdsTxtCache - no duplicates
      AdsTxtCacheMock.getByDomain.mockResolvedValue({
        status: 'success',
        content: 'otherdomain.com, 67890, DIRECT',
      });

      // Setup mock SellersJsonCache with duplicate seller_ids
      SellersJsonCacheMock.getByDomain.mockResolvedValue({
        status: 'success',
        content: JSON.stringify({
          sellers: [
            {
              seller_id: '541058490', // Duplicate ID
              name: 'Test Reseller 1',
              domain: 'reseller1.com',
              seller_type: 'INTERMEDIARY',
            },
            {
              seller_id: '541058490', // Duplicate ID
              name: 'Test Reseller 2',
              domain: 'reseller2.com',
              seller_type: 'INTERMEDIARY',
            },
          ],
        }),
      });

      SellersJsonCacheMock.parseContent.mockImplementation((content) => {
        return JSON.parse(content);
      });

      // Act
      const result = await crossCheckAdsTxtRecords(publisherDomain, records);

      // Assert
      expect(result[0].has_warning).toBe(true);
      expect(result[0].warning).toBe(ERROR_KEYS.SELLER_ID_NOT_UNIQUE);
      expect(result[0].warning_params).toEqual({
        domain: 'openx.com',
        account_id: '541058490',
      });
    });

    it('should ensure uniqueness is properly scoped to each domain', async () => {
      // Arrange
      const publisherDomain = 'publisher.com';
      const records: ParsedAdsTxtRecord[] = [
        {
          domain: 'openx.com',
          account_id: '541058490',
          account_type: 'DIRECT',
          relationship: 'DIRECT',
          line_number: 1,
          raw_line: 'openx.com, 541058490, DIRECT',
          is_valid: true,
        },
        {
          domain: 'google.com',
          account_id: '541058490', // Same ID as openx entry
          account_type: 'RESELLER',
          relationship: 'RESELLER',
          line_number: 2,
          raw_line: 'google.com, 541058490, RESELLER',
          is_valid: true,
        },
      ];

      // Setup mock AdsTxtCache
      AdsTxtCacheMock.getByDomain.mockResolvedValue({
        status: 'success',
        content: 'otherdomain.com, 67890, DIRECT',
      });

      // Setup mock SellersJsonCache for openx.com
      SellersJsonCacheMock.getByDomain.mockImplementation((domain) => {
        if (domain === 'openx.com') {
          return Promise.resolve({
            status: 'success',
            content: JSON.stringify({
              sellers: [
                {
                  seller_id: '541058490',
                  name: 'Test Publisher',
                  domain: 'publisher.com',
                  seller_type: 'PUBLISHER',
                },
              ],
            }),
          });
        } else if (domain === 'google.com') {
          return Promise.resolve({
            status: 'success',
            content: JSON.stringify({
              sellers: [
                {
                  seller_id: '541058490',
                  name: 'Test Reseller',
                  domain: 'reseller.com',
                  seller_type: 'INTERMEDIARY',
                },
              ],
            }),
          });
        }
        return Promise.resolve({ status: 'error', content: null });
      });

      SellersJsonCacheMock.parseContent.mockImplementation((content) => {
        return JSON.parse(content);
      });

      // Act
      const result = await crossCheckAdsTxtRecords(publisherDomain, records);

      // Assert
      // Both records should be valid with no warnings (seller_id is unique within each domain)
      expect(result[0].has_warning).toBeFalsy();
      expect(result[1].has_warning).toBeFalsy();

      // Check that validation results are correct
      if (result[0].validation_results && result[1].validation_results) {
        expect(result[0].validation_results.sellerIdIsUnique).toBe(true);
        expect(result[1].validation_results.resellerSellerIdIsUnique).toBe(true);
      }

      // Check that SellersJsonCache was called for both domains
      expect(SellersJsonCacheMock.getByDomain).toHaveBeenCalledWith('openx.com');
      expect(SellersJsonCacheMock.getByDomain).toHaveBeenCalledWith('google.com');
    });

    it('should handle multiple validation issues in a single record', async () => {
      // Arrange
      const publisherDomain = 'publisher.com';
      const records: ParsedAdsTxtRecord[] = [
        {
          domain: 'openx.com',
          account_id: '541058490',
          account_type: 'DIRECT',
          relationship: 'DIRECT',
          line_number: 1,
          raw_line: 'openx.com, 541058490, DIRECT',
          is_valid: true,
        },
      ];

      // Setup mock AdsTxtCache - no duplicates
      AdsTxtCacheMock.getByDomain.mockResolvedValue({
        status: 'success',
        content: 'otherdomain.com, 67890, DIRECT',
      });

      // Setup mock SellersJsonCache with multiple issues:
      // 1. Domain mismatch
      // 2. Wrong seller_type
      // 3. Non-unique seller_id
      SellersJsonCacheMock.getByDomain.mockResolvedValue({
        status: 'success',
        content: JSON.stringify({
          sellers: [
            {
              seller_id: '541058490',
              name: 'Test Publisher 1',
              domain: 'different-domain.com', // Domain mismatch
              seller_type: 'INTERMEDIARY', // Wrong type for DIRECT
            },
            {
              seller_id: '541058490', // Duplicate ID
              name: 'Test Publisher 2',
              domain: 'another-domain.com',
              seller_type: 'PUBLISHER',
            },
          ],
        }),
      });

      SellersJsonCacheMock.parseContent.mockImplementation((content) => {
        return JSON.parse(content);
      });

      // Act
      const result = await crossCheckAdsTxtRecords(publisherDomain, records);

      // Assert
      expect(result[0].has_warning).toBe(true);

      // Check that all warnings were captured
      expect(result[0].all_warnings).toBeDefined();
      expect(result[0].all_warnings?.length).toBeGreaterThanOrEqual(3);

      // Check that specific issues exist in warnings
      const warningKeys = result[0].all_warnings?.map((w) => w.key) || [];
      expect(warningKeys).toContain(ERROR_KEYS.DOMAIN_MISMATCH);
      expect(warningKeys).toContain(ERROR_KEYS.DIRECT_NOT_PUBLISHER);
      expect(warningKeys).toContain(ERROR_KEYS.SELLER_ID_NOT_UNIQUE);

      // Primary warning should be one of the detected issues
      expect(warningKeys).toContain(result[0].warning);
    });

    it('should handle errors during validation', async () => {
      // Arrange
      const publisherDomain = 'publisher.com';
      const records: ParsedAdsTxtRecord[] = [
        {
          domain: 'openx.com',
          account_id: '541058490',
          account_type: 'DIRECT',
          relationship: 'DIRECT',
          line_number: 1,
          raw_line: 'openx.com, 541058490, DIRECT',
          is_valid: true,
        },
      ];

      // Setup mock AdsTxtCache - no duplicates
      AdsTxtCacheMock.getByDomain.mockResolvedValue({
        status: 'success',
        content: 'otherdomain.com, 67890, DIRECT',
      });

      // Setup mock SellersJsonCache to throw an error
      const errorMessage = 'Test validation error';
      SellersJsonCacheMock.getByDomain.mockResolvedValue({
        status: 'success',
        content: 'Invalid JSON',
      });

      SellersJsonCacheMock.parseContent.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      // Act
      const result = await crossCheckAdsTxtRecords(publisherDomain, records);

      // Assert
      expect(result[0].has_warning).toBe(true);
      expect(result[0].warning).toBe(ERROR_KEYS.SELLERS_JSON_VALIDATION_ERROR);
      expect(result[0].warning_params?.message).toBe(errorMessage);
      expect(result[0].validation_error).toBe(errorMessage);
    });
  });
});
