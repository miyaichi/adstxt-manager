import { AxiosResponse } from 'axios';

const mockAxios = jest.createMockFromModule('axios') as any;

// Mock implementation for methods
mockAxios.get = jest.fn();
mockAxios.post = jest.fn();
mockAxios.put = jest.fn();
mockAxios.delete = jest.fn();
mockAxios.patch = jest.fn();

// Create a default response
mockAxios.createResponse = (data: any, status = 200, headers = {}, responseUrl?: string): AxiosResponse => {
  return {
    data,
    status,
    statusText: status === 200 ? 'OK' : 'ERROR',
    headers,
    config: {
      headers: {
        common: {},
        get: {},
        post: {},
      } as any,
      timeout: 0,
      baseURL: '',
      method: 'get',
    },
    request: responseUrl ? {
      res: {
        responseUrl
      }
    } : undefined
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
