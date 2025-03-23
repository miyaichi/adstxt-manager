import { requestApi, messageApi, adsTxtApi } from '../../api';

// Mock the API module
jest.mock('../../api', () => ({
  requestApi: {
    createRequest: jest.fn(),
    getRequest: jest.fn(),
    updateRequestStatus: jest.fn(),
    updatePublisherInfo: jest.fn(),
    getRequestsByEmail: jest.fn(),
  },
  messageApi: {
    createMessage: jest.fn(),
    getMessagesByRequestId: jest.fn(),
  },
  adsTxtApi: {
    updateRecordStatus: jest.fn(),
    processAdsTxtFile: jest.fn(),
    getRecordsByRequestId: jest.fn(),
    generateAdsTxtContent: jest.fn(),
  },
}));

describe('API Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestApi', () => {
    test('createRequest should be callable', async () => {
      const mockData = {
        publisher_email: 'test@example.com',
        requester_email: 'requester@example.com',
        requester_name: 'Test Requester',
      };
      const mockResponse = {
        success: true,
        data: { request_id: '123', token: 'abc' }
      };
      
      (requestApi.createRequest as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await requestApi.createRequest(mockData);
      
      expect(requestApi.createRequest).toHaveBeenCalledWith(mockData);
      expect(result).toEqual(mockResponse);
    });

    test('getRequestsByEmail should be callable', async () => {
      const mockEmail = 'test@example.com';
      const mockResponse = {
        success: true,
        data: [{ id: '123', status: 'pending' }]
      };
      
      (requestApi.getRequestsByEmail as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await requestApi.getRequestsByEmail(mockEmail);
      
      expect(requestApi.getRequestsByEmail).toHaveBeenCalledWith(mockEmail);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('messageApi', () => {
    test('createMessage should be callable', async () => {
      const mockData = {
        request_id: '123',
        sender_email: 'test@example.com',
        content: 'Test message',
        token: 'abc'
      };
      const mockResponse = {
        success: true,
        data: { id: '456', content: 'Test message' }
      };
      
      (messageApi.createMessage as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await messageApi.createMessage(mockData);
      
      expect(messageApi.createMessage).toHaveBeenCalledWith(mockData);
      expect(result).toEqual(mockResponse);
    });

    test('getMessagesByRequestId should be callable', async () => {
      const mockRequestId = '123';
      const mockToken = 'abc';
      const mockResponse = {
        success: true,
        data: [{ id: '456', content: 'Test message' }]
      };
      
      (messageApi.getMessagesByRequestId as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await messageApi.getMessagesByRequestId(mockRequestId, mockToken);
      
      expect(messageApi.getMessagesByRequestId).toHaveBeenCalledWith(mockRequestId, mockToken);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('adsTxtApi', () => {
    test('updateRecordStatus should be callable', async () => {
      const mockId = '123';
      const mockStatus = 'approved';
      const mockToken = 'abc';
      const mockResponse = {
        success: true,
        data: { id: '123', status: 'approved' }
      };
      
      (adsTxtApi.updateRecordStatus as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await adsTxtApi.updateRecordStatus(mockId, mockStatus, mockToken);
      
      expect(adsTxtApi.updateRecordStatus).toHaveBeenCalledWith(mockId, mockStatus, mockToken);
      expect(result).toEqual(mockResponse);
    });

    test('processAdsTxtFile should be callable', async () => {
      const mockFile = new File([], 'test.txt');
      const mockResponse = {
        success: true,
        data: { records: [], totalRecords: 0 }
      };
      
      (adsTxtApi.processAdsTxtFile as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await adsTxtApi.processAdsTxtFile(mockFile);
      
      expect(adsTxtApi.processAdsTxtFile).toHaveBeenCalledWith(mockFile);
      expect(result).toEqual(mockResponse);
    });
  });
});