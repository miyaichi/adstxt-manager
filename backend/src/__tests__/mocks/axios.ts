import { AxiosResponse } from 'axios';

const mockAxios = jest.createMockFromModule('axios') as any;

// Mock implementation for methods
mockAxios.get = jest.fn();
mockAxios.post = jest.fn();
mockAxios.put = jest.fn();
mockAxios.delete = jest.fn();
mockAxios.patch = jest.fn();

// Create a default response
mockAxios.createResponse = (data: any, status = 200, headers = {}): AxiosResponse => {
  return {
    data,
    status,
    statusText: status === 200 ? 'OK' : 'ERROR',
    headers,
    config: {
      headers: {},
      timeout: 0,
      baseURL: '',
      method: 'get'
    },
  };
};

// Reset all mock implementations
mockAxios.reset = () => {
  mockAxios.get.mockReset();
  mockAxios.post.mockReset();
  mockAxios.put.mockReset();
  mockAxios.delete.mockReset();
  mockAxios.patch.mockReset();
};

export default mockAxios;