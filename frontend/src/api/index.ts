import axios from 'axios';
import {
  AdsTxtCacheResponse,
  AdsTxtRecord,
  ApiResponse,
  CreateMessageData,
  CreateRequestData,
  Message,
  OptimizeAdsTxtResponse,
  ProcessAdsTxtResponse,
  Request,
  RequestResponse,
  RequestWithRecords,
  SellersJsonMetadataResponse,
  SellersJsonSellerResponse,
} from '../models';
import { createLogger } from '../utils/logger';

// Ensure FormData and File are available in the global scope
declare global {
  interface Window {
    FormData: typeof FormData;
    File: typeof File;
  }
}

// Create a logger for the API module
const logger = createLogger('API');

// Get current language preference
const getLanguage = (): string => {
  // Try to get from localStorage first
  const savedLanguage = localStorage.getItem('userLanguage');
  if (savedLanguage) {
    return savedLanguage;
  }

  // Otherwise, use browser language or default to English
  const browserLanguage = navigator.language.split('-')[0];
  return ['en', 'ja'].includes(browserLanguage) ? browserLanguage : 'en';
};

// Configure axios
// Use relative path - let the React proxy handle the redirection in development
// In development mode, the proxy in package.json will redirect /api to http://localhost:3001/api
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // The default timeout is 15 seconds
});

// Add request interceptor to update language on each request
api.interceptors.request.use((config) => {
  config.headers['Accept-Language'] = getLanguage();
  return config;
});

// Request API calls
export const requestApi = {
  // Create a new request
  async createRequest(data: CreateRequestData): Promise<ApiResponse<RequestResponse>> {
    const formData = new FormData();
    formData.append('publisher_email', data.publisher_email);
    formData.append('requester_email', data.requester_email);
    formData.append('requester_name', data.requester_name);

    if (data.publisher_name) {
      formData.append('publisher_name', data.publisher_name);
    }

    if (data.publisher_domain) {
      formData.append('publisher_domain', data.publisher_domain);
    }

    // Add either the file or JSON records
    if (data.adsTxtFile) {
      formData.append('adsTxtFile', data.adsTxtFile);
    } else if (data.records) {
      formData.append('records', JSON.stringify(data.records));
    }

    const response = await api.post<ApiResponse<RequestResponse>>('/requests', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get a request by ID
  async getRequest(id: string, token: string): Promise<ApiResponse<RequestWithRecords>> {
    const response = await api.get<ApiResponse<RequestWithRecords>>(
      `/requests/${id}?token=${token}`
    );
    return response.data;
  },

  // Update request status
  async updateRequestStatus(
    id: string,
    status: string,
    token: string
  ): Promise<ApiResponse<Request>> {
    const response = await api.patch<ApiResponse<Request>>(`/requests/${id}/status`, {
      status,
      token,
    });
    return response.data;
  },

  // Update publisher information
  async updatePublisherInfo(
    id: string,
    publisher_name: string,
    publisher_domain: string,
    token: string
  ): Promise<ApiResponse<Request>> {
    const response = await api.patch<ApiResponse<Request>>(`/requests/${id}/publisher`, {
      publisher_name,
      publisher_domain,
      token,
    });
    return response.data;
  },

  // Get requests by email
  async getRequestsByEmail(
    email: string,
    role?: 'publisher' | 'requester'
  ): Promise<ApiResponse<Request[]>> {
    const url = role ? `/requests/email/${email}?role=${role}` : `/requests/email/${email}`;

    const response = await api.get<ApiResponse<Request[]>>(url);
    return response.data;
  },

  // Update a request with new records
  async updateRequest(
    id: string,
    data: {
      token: string;
      records: AdsTxtRecord[];
      requester_name?: string;
      publisher_name?: string;
      publisher_domain?: string;
    }
  ): Promise<ApiResponse<RequestResponse>> {
    const response = await api.put<ApiResponse<RequestResponse>>(`/requests/${id}`, data);
    return response.data;
  },
};

// Message API calls
export const messageApi = {
  // Create a new message
  async createMessage(data: CreateMessageData): Promise<ApiResponse<Message>> {
    const response = await api.post<ApiResponse<Message>>('/messages', data);
    return response.data;
  },

  // Get messages by request ID
  async getMessagesByRequestId(requestId: string, token: string): Promise<ApiResponse<Message[]>> {
    logger.debug('API Call: getMessagesByRequestId', { requestId, token });
    try {
      const encodedToken = encodeURIComponent(token);
      const url = `/messages/${requestId}?token=${encodedToken}`;
      logger.debug('Request URL:', url);

      const response = await api.get<ApiResponse<Message[]>>(url);
      logger.debug('API Response:', response.data);
      return response.data;
    } catch (error) {
      logger.error('API Error in getMessagesByRequestId:', error);
      if (axios.isAxiosError(error)) {
        logger.error('Request details:', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          statusText: error.response?.statusText,
          responseData: error.response?.data,
        });
      }
      throw error;
    }
  },
};

// Ads.txt API calls
export const adsTxtApi = {
  // Update record status
  async updateRecordStatus(
    id: string,
    status: string,
    token: string
  ): Promise<ApiResponse<AdsTxtRecord>> {
    const response = await api.patch<ApiResponse<AdsTxtRecord>>(`/adsTxt/${id}/status`, {
      status,
      token,
    });
    return response.data;
  },

  // Process Ads.txt file or text content
  async processAdsTxtFile(
    fileOrContent: File | string,
    publisherDomain?: string
  ): Promise<ApiResponse<ProcessAdsTxtResponse>> {
    // If it's a file, use FormData
    if (fileOrContent instanceof File) {
      const formData = new FormData();
      formData.append('adsTxtFile', fileOrContent);

      // Add publisher domain if provided
      if (publisherDomain) {
        formData.append('publisherDomain', publisherDomain);
      }

      const response = await api.post<ApiResponse<ProcessAdsTxtResponse>>(
        '/adsTxt/process',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    }
    // If it's text content, send as JSON
    else {
      const data: any = {
        adsTxtContent: fileOrContent,
      };

      // Add publisher domain if provided
      if (publisherDomain) {
        data.publisherDomain = publisherDomain;
      }

      const response = await api.post<ApiResponse<ProcessAdsTxtResponse>>('/adsTxt/process', data);
      return response.data;
    }
  },

  // Get records by request ID
  async getRecordsByRequestId(
    requestId: string,
    token: string
  ): Promise<ApiResponse<AdsTxtRecord[]>> {
    const response = await api.get<ApiResponse<AdsTxtRecord[]>>(
      `/adsTxt/request/${requestId}?token=${token}`
    );
    return response.data;
  },

  // Generate Ads.txt content
  async generateAdsTxtContent(requestId: string, token: string): Promise<string> {
    const response = await api.get<string>(`/adsTxt/generate/${requestId}?token=${token}`, {
      responseType: 'text',
    });
    return response.data;
  },

  // Fetch ads.txt from a domain
  async getAdsTxtFromDomain(
    domain: string,
    force: boolean = false
  ): Promise<ApiResponse<AdsTxtCacheResponse>> {
    console.log(`Fetching ads.txt from domain: ${domain}${force ? ' (force refresh)' : ''}`);
    const url = `/adsTxtCache/domain/${encodeURIComponent(domain)}${force ? '?force=true' : ''}`;
    const response = await api.get<ApiResponse<AdsTxtCacheResponse>>(url);
    console.log('Response received:', response.data);
    return response.data;
  },

  // Optimize Ads.txt content
  async optimizeAdsTxtContent(
    content: string,
    publisherDomain?: string
  ): Promise<ApiResponse<OptimizeAdsTxtResponse>> {
    const data: any = {
      content: content,
    };

    // Add publisher domain if provided
    if (publisherDomain) {
      data.publisher_domain = publisherDomain;
    }

    const response = await api.post<ApiResponse<OptimizeAdsTxtResponse>>('/adsTxt/optimize', data);
    return response.data;
  },
};

// Sellers.json API calls
export const sellersJsonApi = {
  // Get sellers.json for a domain (legacy endpoint for backward compatibility)
  async getSellersJson(domain: string): Promise<ApiResponse<any>> {
    const response = await api.get<ApiResponse<any>>(`/sellersJson/${encodeURIComponent(domain)}`);
    return response.data;
  },

  // Get only metadata from a domain's sellers.json (new optimized endpoint)
  async getMetadata(domain: string): Promise<ApiResponse<SellersJsonMetadataResponse>> {
    const url = `/sellersJson/${encodeURIComponent(domain)}/metadata`;
    const response = await api.get<ApiResponse<SellersJsonMetadataResponse>>(url);
    return response.data;
  },

  // Get specific seller by seller_id from a domain's sellers.json (improved with types)
  async getSellerById(
    domain: string,
    sellerId: string
  ): Promise<ApiResponse<SellersJsonSellerResponse>> {
    const url = `/sellersJson/${encodeURIComponent(domain)}/seller/${encodeURIComponent(sellerId)}`;
    logger.debug('Fetching seller data:', { domain, sellerId, url });

    try {
      const response = await api.get<ApiResponse<SellersJsonSellerResponse>>(url);
      logger.debug('Seller data response:', response.data);
      return response.data;
    } catch (error) {
      logger.error('Error fetching seller data:', error);
      throw error;
    }
  },
};

// Status API calls
export const statusApi = {
  // Get system status
  async getStatus(): Promise<any> {
    try {
      console.log('Fetching status from API endpoint...');

      // Use the configured API client
      const response = await api.get('/status');
      console.log('Status response raw:', response);
      console.log('Status response data:', response.data);

      // Return a direct response from the backend
      return response.data;
    } catch (error) {
      console.error('Status endpoint failed:', error);
      throw error;
    }
  },
};

// Export API as a named constant
const apiClient = {
  request: requestApi,
  message: messageApi,
  adsTxt: adsTxtApi,
  sellersJson: sellersJsonApi,
  status: statusApi,
};

export default apiClient;
