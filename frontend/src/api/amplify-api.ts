// Amplify Gen2 API Wrapper
import { client } from '../amplify-client';
import * as queries from '../queries';
import * as mutations from '../mutations';
import * as API from '../API';
import { createLogger } from '../utils/logger';

const logger = createLogger('AmplifyAPI');

// Request API calls using Amplify Gen2
export const requestApi = {
  // Create a new request
  async createRequest(data: any): Promise<any> {
    try {
      const input: API.CreateRequestInput = {
        publisher_email: data.publisher_email,
        requester_email: data.requester_email,
        requester_name: data.requester_name,
        publisher_name: data.publisher_name || null,
        publisher_domain: data.publisher_domain || null,
        status: 'PENDING', // Default status
        token: Math.random().toString(36).substring(2, 15),
        created_at: new Date().toISOString(),
      };

      const result = await client.graphql({
        query: mutations.createRequest,
        variables: { input },
      });

      // Process records if they exist (this would need to be handled as a separate step)
      if (data.records || data.adsTxtFile) {
        logger.info('Records or file should be processed separately with Amplify');
      }

      // Use type assertion to handle GraphQL result
      const graphqlResult = result as { data: { createRequest: any } };
      
      return {
        success: true,
        data: {
          request: graphqlResult.data.createRequest,
        },
      };
    } catch (error) {
      logger.error('Error creating request with Amplify:', error);
      return {
        success: false,
        error: 'Failed to create request',
      };
    }
  },

  // Get a request by ID
  async getRequest(id: string, token: string): Promise<any> {
    try {
      const result = await client.graphql({
        query: queries.getRequest,
        variables: { id },
      });

      // Use type assertion to handle GraphQL result
      const graphqlResult = result as { data: { getRequest: any } };
      
      // Verify token
      if (graphqlResult.data.getRequest.token !== token) {
        return {
          success: false,
          error: 'Invalid token',
        };
      }

      return {
        success: true,
        data: graphqlResult.data.getRequest,
      };
    } catch (error) {
      logger.error('Error getting request with Amplify:', error);
      return {
        success: false,
        error: 'Failed to get request',
      };
    }
  },

  // Update request status
  async updateRequestStatus(id: string, status: string, token: string): Promise<any> {
    try {
      // First get the request to verify token
      const getResult = await client.graphql({
        query: queries.getRequest,
        variables: { id },
      });

      // Use type assertion to handle GraphQL result
      const getGraphqlResult = getResult as { data: { getRequest: any } };
      
      if (getGraphqlResult.data.getRequest.token !== token) {
        return {
          success: false,
          error: 'Invalid token',
        };
      }

      // Update the request
      const input: API.UpdateRequestInput = {
        id,
        status,
        updated_at: new Date().toISOString(),
      };

      const result = await client.graphql({
        query: mutations.updateRequest,
        variables: { input },
      });

      return {
        success: true,
        data: (result as { data: { updateRequest: any } }).data.updateRequest,
      };
    } catch (error) {
      logger.error('Error updating request status with Amplify:', error);
      return {
        success: false,
        error: 'Failed to update request status',
      };
    }
  },

  // Get requests by email
  async getRequestsByEmail(email: string, role?: 'publisher' | 'requester'): Promise<any> {
    try {
      // Determine filter based on role
      let filter: API.ModelRequestFilterInput = {};

      if (role === 'publisher') {
        filter = { publisher_email: { eq: email } };
      } else if (role === 'requester') {
        filter = { requester_email: { eq: email } };
      } else {
        // If no role specified, look in both fields
        filter = {
          or: [{ publisher_email: { eq: email } }, { requester_email: { eq: email } }],
        };
      }

      const result = await client.graphql({
        query: queries.listRequestsByEmail,
        variables: { email: email, ...(role ? { role } : {}) },
      });

      return {
        success: true,
        data: (result as { data: { listRequests: { items: any[] } } }).data.listRequests.items,
      };
    } catch (error) {
      logger.error('Error getting requests by email with Amplify:', error);
      return {
        success: false,
        error: 'Failed to get requests by email',
      };
    }
  },
};

// Message API calls
export const messageApi = {
  // Create a new message
  async createMessage(data: any): Promise<any> {
    try {
      const input: API.CreateMessageInput = {
        content: data.content,
        sender_email: data.sender_email,
        request_id: data.request_id,
        created_at: new Date().toISOString(),
      };

      const result = await client.graphql({
        query: mutations.createMessage,
        variables: { input },
      });

      return {
        success: true,
        data: (result as { data: { createMessage: any } }).data.createMessage,
      };
    } catch (error) {
      logger.error('Error creating message with Amplify:', error);
      return {
        success: false,
        error: 'Failed to create message',
      };
    }
  },

  // Get messages by request ID
  async getMessagesByRequestId(requestId: string, token: string): Promise<any> {
    try {
      // First verify token by getting the request
      const requestResult = await client.graphql({
        query: queries.getRequest,
        variables: { id: requestId },
      });

      // Use type assertion to handle GraphQL result
      const requestGraphqlResult = requestResult as { data: { getRequest: any } };
      
      if (requestGraphqlResult.data.getRequest.token !== token) {
        return {
          success: false,
          error: 'Invalid token',
        };
      }

      // Then get messages for this request
      const filter: API.ModelMessageFilterInput = {
        request_id: { eq: requestId },
      };

      const result = await client.graphql({
        query: queries.listMessages,
        variables: { filter },
      });

      return {
        success: true,
        data: (result as { data: { listMessages: { items: any[] } } }).data.listMessages.items,
      };
    } catch (error) {
      logger.error('Error getting messages with Amplify:', error);
      return {
        success: false,
        error: 'Failed to get messages',
      };
    }
  },
};

// Ads.txt API calls
export const adsTxtApi = {
  // Note: These are simplified implementations as they would need
  // additional work to fully implement with Amplify

  // Update record status
  async updateRecordStatus(id: string, status: string, token: string): Promise<any> {
    try {
      // First verify token
      // This would require finding which request this record belongs to

      // Then update the record
      const input: API.UpdateAdsTxtRecordInput = {
        id,
        status,
        updated_at: new Date().toISOString(),
      };

      const result = await client.graphql({
        query: mutations.updateAdsTxtRecord,
        variables: { input },
      });

      return {
        success: true,
        data: (result as { data: { updateAdsTxtRecord: any } }).data.updateAdsTxtRecord,
      };
    } catch (error) {
      logger.error('Error updating record status with Amplify:', error);
      return {
        success: false,
        error: 'Failed to update record status',
      };
    }
  },

  // Generate Ads.txt content
  // This would need a custom implementation with Amplify
  async generateAdsTxtContent(requestId: string, token: string): Promise<string> {
    // This might need to be implemented as a custom resolver or Lambda function
    return '# This would be generated Ads.txt content in a real implementation';
  },
  
  // Process Ads.txt file or text content
  async processAdsTxtFile(fileOrContent: File | string, publisherDomain?: string): Promise<any> {
    try {
      // This would need a custom implementation with Amplify
      // For now, return a simplified mock response structure
      return {
        success: true,
        data: {
          records: [],
          invalidRecords: 0,
          warnings: [],
          errors: []
        }
      };
    } catch (error) {
      logger.error('Error processing ads.txt with Amplify:', error);
      return {
        success: false,
        error: 'Failed to process ads.txt file or content'
      };
    }
  },
  
  // Get ads.txt from a domain
  async getAdsTxtFromDomain(domain: string, force: boolean = false): Promise<any> {
    try {
      // Use the adsTxtCacheByDomain query
      const result = await client.graphql({
        query: queries.getAdsTxtCacheByDomain,
        variables: { domain },
      });
      
      const graphqlResult = result as { data: { adsTxtCacheByDomain: { items: any[] } } };
      const items = graphqlResult.data.adsTxtCacheByDomain.items;
      
      if (items && items.length > 0) {
        return {
          success: true,
          data: items[0]
        };
      } else {
        return {
          success: false,
          error: 'No ads.txt cache found for domain'
        };
      }
    } catch (error) {
      logger.error('Error fetching ads.txt from domain with Amplify:', error);
      return {
        success: false,
        error: 'Failed to fetch ads.txt from domain'
      };
    }
  },
};

// Export the API interfaces
export default {
  request: requestApi,
  message: messageApi,
  adsTxt: adsTxtApi,
};
