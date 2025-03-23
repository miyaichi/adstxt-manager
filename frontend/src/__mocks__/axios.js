// Mock for axios
const axiosMock = {
  create: jest.fn(() => axiosMock),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  request: jest.fn(),
  defaults: {
    headers: {
      common: {},
      get: {},
      post: {}
    }
  }
};

module.exports = axiosMock;