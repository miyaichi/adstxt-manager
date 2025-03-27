/**
 * Mock for AdsTxtCache model used in tests
 */
const AdsTxtCacheMock = {
  getByDomain: jest.fn(),
  saveCache: jest.fn(),
  isCacheExpired: jest.fn(),
};

export default AdsTxtCacheMock;
