import axios from 'axios';
import {
  AdsTxtRecord,
  ApiResponse,
  CreateMessageData,
  CreateRequestData,
  Message,
  ProcessAdsTxtResponse,
  Request,
  RequestResponse,
  RequestWithRecords
} from '../models';

// Ensure FormData and File are available in the global scope
declare global {
  interface Window {
    FormData: typeof FormData;
    File: typeof File;
  }
}

// Configure axios
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
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
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },
  
  // Get a request by ID
  async getRequest(id: string, token: string): Promise<ApiResponse<RequestWithRecords>> {
    const response = await api.get<ApiResponse<RequestWithRecords>>(`/requests/${id}?token=${token}`);
    return response.data;
  },
  
  // Update request status
  async updateRequestStatus(id: string, status: string, token: string): Promise<ApiResponse<Request>> {
    const response = await api.patch<ApiResponse<Request>>(`/requests/${id}/status`, {
      status,
      token
    });
    return response.data;
  },
  
  // Update publisher information
  async updatePublisherInfo(id: string, publisher_name: string, publisher_domain: string, token: string): Promise<ApiResponse<Request>> {
    const response = await api.patch<ApiResponse<Request>>(`/requests/${id}/publisher`, {
      publisher_name,
      publisher_domain,
      token
    });
    return response.data;
  },
  
  // Get requests by email
  async getRequestsByEmail(email: string, role?: 'publisher' | 'requester'): Promise<ApiResponse<Request[]>> {
    const url = role 
      ? `/requests/email/${email}?role=${role}`
      : `/requests/email/${email}`;
    
    const response = await api.get<ApiResponse<Request[]>>(url);
    return response.data;
  }
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
    const response = await api.get<ApiResponse<Message[]>>(`/messages/${requestId}?token=${token}`);
    return response.data;
  }
};

// Ads.txt API calls
export const adsTxtApi = {
  // Update record status
  async updateRecordStatus(id: string, status: string, token: string): Promise<ApiResponse<AdsTxtRecord>> {
    const response = await api.patch<ApiResponse<AdsTxtRecord>>(`/adstxt/${id}/status`, {
      status,
      token
    });
    return response.data;
  },
  
  // Process Ads.txt file
  async processAdsTxtFile(file: File): Promise<ApiResponse<ProcessAdsTxtResponse>> {
    const formData = new FormData();
    formData.append('adsTxtFile', file);
    
    const response = await api.post<ApiResponse<ProcessAdsTxtResponse>>('/adstxt/process', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },
  
  // Get records by request ID
  async getRecordsByRequestId(requestId: string, token: string): Promise<ApiResponse<AdsTxtRecord[]>> {
    const response = await api.get<ApiResponse<AdsTxtRecord[]>>(`/adstxt/request/${requestId}?token=${token}`);
    return response.data;
  },
  
  // Generate Ads.txt content
  async generateAdsTxtContent(requestId: string, token: string): Promise<string> {
    const response = await api.get<string>(`/adstxt/generate/${requestId}?token=${token}`, {
      responseType: 'text'
    });
    return response.data;
  }
};

export default {
  request: requestApi,
  message: messageApi,
  adsTxt: adsTxtApi
};