/**
 * Mock for SellersJsonCache model used in tests
 */
const SellersJsonCacheMock = {
  getByDomain: jest.fn(),
  parseContent: jest.fn(),
  saveCache: jest.fn(),
  isCacheExpired: jest.fn(),
};

export default SellersJsonCacheMock;
