import { crossCheckAdsTxtRecords, ParsedAdsTxtRecord } from '../validation';

/**
 * Unit tests specifically for the crossCheckAdsTxtRecords function
 * Using isolated mocks to avoid issues with database and external dependencies
 */
describe('crossCheckAdsTxtRecords Tests', () => {
  // Setup mocks
  const mockGetByDomain = jest.fn();
  const mockParseContent = jest.fn();

  // Mock the dynamic imports
  jest.mock('../../models/AdsTxtCache', () => {
    return {
      __esModule: true,
      default: {
        getByDomain: mockGetByDomain,
      },
    };
  });

  jest.mock('../../models/SellersJsonCache', () => {
    return {
      __esModule: true,
      default: {
        getByDomain: mockGetByDomain,
        parseContent: mockParseContent,
      },
    };
  });

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockGetByDomain.mockImplementation((domain) => {
      if (domain === 'example.com') {
        return Promise.resolve({
          status: 'success',
          content: 'otherdomain.com, 67890, DIRECT',
        });
      } else if (domain === 'openx.com') {
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
      }
      return Promise.resolve(null);
    });

    mockParseContent.mockImplementation((content) => {
      try {
        return JSON.parse(content);
      } catch (e) {
        return null;
      }
    });
  });

  test('should handle undefined publisher domain', async () => {
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
    expect(result).toEqual(records);
    expect(result.length).toBe(1);
  });

  test('should handle missing AdsTxtCache data', async () => {
    // Arrange
    const publisherDomain = 'example.com';
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

    // Mock AdsTxtCache to return null
    mockGetByDomain.mockResolvedValueOnce(null);

    // Mock SellersJsonCache to return sellers.json with NO_SELLERS_JSON status
    // (this adds has_warning to the result)
    mockGetByDomain.mockResolvedValueOnce({
      status: 'error',
      content: null,
    });

    // Act
    const result = await crossCheckAdsTxtRecords(publisherDomain, records);

    // Assert - Don't do exact equality check due to additional warnings from sellers.json check
    expect(result.length).toEqual(records.length);
    expect(result[0].domain).toEqual('google.com');
    expect(result[0].account_id).toEqual('12345');
    expect(mockGetByDomain).toHaveBeenCalledWith(publisherDomain);
    expect(mockGetByDomain).toHaveBeenCalledWith('google.com');
  });

  // Add more tests for the specific validation cases
});
