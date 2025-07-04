import axios from 'axios';
import {
  AdsTxtCacheResponse,
  AdsTxtRecord,
  ApiResponse,
  CreateMessageData,
  CreateRequestData,
  GetPublisherMetadataRequest,
  GetPublisherMetadataResponse,
  Message,
  OptimizeAdsTxtResponse,
  ProcessAdsTxtResponse,
  PublisherMetadata,
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

// Get current language preference based on URL param, sessionStorage or browser
const getLanguage = (): string => {
  // First priority: Check URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const langParam = urlParams.get('lang');
  if (langParam && ['en', 'ja'].includes(langParam)) {
    return langParam;
  }

  // Second priority: sessionStorage
  const savedLanguage = sessionStorage.getItem('userLanguage');
  if (savedLanguage && ['en', 'ja'].includes(savedLanguage)) {
    return savedLanguage;
  }

  // Last resort: browser language
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
  timeout: 30000, // Increased timeout to 30 seconds for all API calls (especially for large sellers.json)
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

    // Add current language to request URL
    const currentLang = getLanguage();
    const langParam = `?lang=${currentLang}`;

    const response = await api.post<ApiResponse<RequestResponse>>(
      `/requests${langParam}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // Get a request by ID
  async getRequest(id: string, token: string): Promise<ApiResponse<RequestWithRecords>> {
    // Add current language to request
    const currentLang = getLanguage();
    const response = await api.get<ApiResponse<RequestWithRecords>>(
      `/requests/${id}?token=${token}&lang=${currentLang}`
    );
    return response.data;
  },

  // Update request status
  async updateRequestStatus(
    id: string,
    status: string,
    token: string
  ): Promise<ApiResponse<Request>> {
    // Add current language to request URL
    const currentLang = getLanguage();
    const langParam = `?lang=${currentLang}`;

    const response = await api.patch<ApiResponse<Request>>(`/requests/${id}/status${langParam}`, {
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
    // Add current language to request URL
    const currentLang = getLanguage();
    const langParam = `?lang=${currentLang}`;

    const response = await api.patch<ApiResponse<Request>>(
      `/requests/${id}/publisher${langParam}`,
      {
        publisher_name,
        publisher_domain,
        token,
      }
    );
    return response.data;
  },

  // Get requests by email
  async getRequestsByEmail(
    email: string,
    role?: 'publisher' | 'requester',
    token?: string
  ): Promise<ApiResponse<Request[]>> {
    // Add current language to request URL
    const currentLang = getLanguage();
    const roleParam = role ? `role=${role}&` : '';
    const tokenParam = token ? `token=${encodeURIComponent(token)}&` : '';
    const url = `/requests/email/${email}?${roleParam}${tokenParam}lang=${currentLang}`;

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
    // Add current language to request URL
    const currentLang = getLanguage();
    const langParam = `?lang=${currentLang}`;

    const response = await api.put<ApiResponse<RequestResponse>>(
      `/requests/${id}${langParam}`,
      data
    );
    return response.data;
  },
};

// Message API calls
export const messageApi = {
  // Create a new message
  async createMessage(data: CreateMessageData): Promise<ApiResponse<Message>> {
    // Get current language to send with request
    const currentLang = getLanguage();
    const langParam = `?lang=${currentLang}`;

    // Add language parameter to URL
    const response = await api.post<ApiResponse<Message>>(`/messages${langParam}`, data);
    return response.data;
  },

  // Get messages by request ID
  async getMessagesByRequestId(requestId: string, token: string): Promise<ApiResponse<Message[]>> {
    logger.debug('API Call: getMessagesByRequestId', { requestId, token });
    try {
      const encodedToken = encodeURIComponent(token);
      // Add current language to request
      const currentLang = getLanguage();
      const url = `/messages/${requestId}?token=${encodedToken}&lang=${currentLang}`;
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
    publisherDomain?: string,
    level?: 'level1' | 'level2'
  ): Promise<ApiResponse<OptimizeAdsTxtResponse>> {
    const data: any = {
      content: content,
    };

    // Add publisher domain if provided
    if (publisherDomain) {
      data.publisher_domain = publisherDomain;
    }

    // Add optimization level if provided
    if (level) {
      data.level = level;
    }

    // Use extended timeout (0 = no timeout) for level2 optimization due to potentially long processing time
    const timeout = level === 'level2' ? 0 : 15000;

    // Log the timeout setting for debugging purposes
    logger.debug(
      `Optimizing ads.txt with ${level || 'default'} level, timeout: ${timeout === 0 ? 'unlimited' : timeout + 'ms'}`
    );

    // Create a custom request with specific timeout for this operation
    const response = await api.post<ApiResponse<OptimizeAdsTxtResponse>>('/adsTxt/optimize', data, {
      timeout: timeout,
    });

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
    // Use longer timeout for metadata retrieval from large files
    const response = await api.get<ApiResponse<SellersJsonMetadataResponse>>(url, {
      timeout: 30000, // 30 seconds timeout for metadata retrieval
    });
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
      // Use longer timeout (45 seconds) for seller lookups in large sellers.json files
      const response = await api.get<ApiResponse<SellersJsonSellerResponse>>(url, {
        timeout: 45000, // 45 seconds timeout for large sellers.json files like Google's
      });
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

// OpenSincera API calls
export const openSinceraApi = {
  // Health check for OpenSincera API
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    const url = '/opensincera/health';
    logger.debug('Checking OpenSincera API health:', { url });

    try {
      const response = await api.get<ApiResponse<{ status: string; timestamp: string }>>(url);
      logger.debug('OpenSincera health check response:', response.data);
      return response.data;
    } catch (error) {
      logger.error('Error checking OpenSincera API health:', error);
      throw error;
    }
  },

  // Get publisher metadata
  async getPublisherMetadata(
    request: GetPublisherMetadataRequest
  ): Promise<ApiResponse<GetPublisherMetadataResponse>> {
    const url = '/opensincera/publishers/metadata';
    logger.debug('Fetching publisher metadata:', { request, url });

    try {
      const params: Record<string, any> = {};
      
      if (request.publisherId) {
        params.publisherId = request.publisherId;
      }
      
      if (request.publisherDomain) {
        params.publisherDomain = request.publisherDomain;
      }
      
      if (request.limit !== undefined) {
        params.limit = request.limit;
      }
      
      if (request.offset !== undefined) {
        params.offset = request.offset;
      }
      
      if (request.includeInactive !== undefined) {
        params.includeInactive = request.includeInactive;
      }

      const response = await api.get<ApiResponse<GetPublisherMetadataResponse>>(url, { params });
      logger.debug('Publisher metadata response:', response.data);
      return response.data;
    } catch (error) {
      logger.error('Error fetching publisher metadata:', error);
      throw error;
    }
  },

  // Get publisher by domain
  async getPublisherByDomain(domain: string): Promise<ApiResponse<PublisherMetadata | null>> {
    const url = `/opensincera/publishers/domain/${encodeURIComponent(domain)}`;
    logger.debug('Fetching publisher by domain:', { domain, url });

    try {
      const response = await api.get<ApiResponse<PublisherMetadata>>(url);
      logger.debug('Publisher by domain response:', response.data);
      return response.data;
    } catch (error) {
      logger.error('Error fetching publisher by domain:', error);
      throw error;
    }
  },

  // Get publisher by ID
  async getPublisherById(publisherId: string): Promise<ApiResponse<PublisherMetadata | null>> {
    const url = `/opensincera/publishers/${encodeURIComponent(publisherId)}`;
    logger.debug('Fetching publisher by ID:', { publisherId, url });

    try {
      const response = await api.get<ApiResponse<PublisherMetadata>>(url);
      logger.debug('Publisher by ID response:', response.data);
      return response.data;
    } catch (error) {
      logger.error('Error fetching publisher by ID:', error);
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
  openSincera: openSinceraApi,
};

export default apiClient;
