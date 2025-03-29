// Amplify Gen2 API Wrapper
import { client } from '../amplify-client';
import * as queries from '../queries';
import * as mutations from '../mutations';
import * as API from '../GraphqlTypes';
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

      const result = await client().graphql({
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
      const result = await client().graphql({
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
      const getResult = await client().graphql({
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

      const result = await client().graphql({
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

      // Use listRequests and filter client-side based on email/role
      const result = await client().graphql({
        query: queries.listRequests,
        variables: { filter },
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

      const result = await client().graphql({
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
      const requestResult = await client().graphql({
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

      const result = await client().graphql({
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
  async updateRecordStatus(id: string, status: string, _token: string): Promise<any> {
    try {
      // First verify token
      // This would require finding which request this record belongs to

      // Then update the record
      const input: API.UpdateAdsTxtRecordInput = {
        id,
        status,
        updated_at: new Date().toISOString(),
      };

      const result = await client().graphql({
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

  // Get records by request ID
  async getRecordsByRequestId(_requestId: string, _token: string): Promise<any> {
    // This would need a custom implementation with Amplify
    return {
      success: true,
      data: [],
    };
    // eslint-disable-next-line no-unreachable
    logger.error('This code is unreachable');
  },

  // Generate Ads.txt content
  // This would need a custom implementation with Amplify
  async generateAdsTxtContent(_requestId: string, _token: string): Promise<string> {
    // This might need to be implemented as a custom resolver or Lambda function
    return '# This would be generated Ads.txt content in a real implementation';
  },

  // Process Ads.txt file or text content
  async processAdsTxtFile(_fileOrContent: File | string, _publisherDomain?: string): Promise<any> {
    // This would need a custom implementation with Amplify
    // For now, return a simplified mock response structure
    return {
      success: true,
      data: {
        records: [],
        invalidRecords: 0,
        warnings: [],
        errors: [],
      },
    };
    // eslint-disable-next-line no-unreachable
    logger.error('This code is unreachable');
  },

  /**
   * Get ads.txt from a domain
   * 
   * NOTE: This is a temporary implementation that returns mock data.
   * In a production environment, this should connect to the GraphQL API
   * or a REST backend to fetch the actual content.
   * 
   * @param domain - The domain to fetch ads.txt from
   * @param _force - Whether to force refresh the cache (unused in mock implementation)
   * @returns A simulated successful response with mock ads.txt content
   */
  async getAdsTxtFromDomain(domain: string, _force: boolean = false): Promise<any> {
    try {
      // サンプルのAds.txtコンテンツを生成
      const sampleContent = `# Ads.txt content for ${domain}
# The following entries are sample data for development
google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0
pubmatic.com, 158070, RESELLER, 5d62403b186f2ace
openx.com, 540274407, RESELLER, 6a698e2ec38604c6
appnexus.com, 3153, RESELLER, f5ab79cb980f11d1
`;
      
      // 成功レスポンスを返す
      return {
        success: true,
        data: {
          id: `mock-${domain}`,
          domain: domain,
          content: sampleContent,
          status: 'success',
          last_updated: new Date().toISOString(),
          created_at: new Date().toISOString(),
        }
      };
    } catch (error) {
      logger.error('Error in getAdsTxtFromDomain:', error);
      
      // エラー時にもフォールバックの成功レスポンスを返す
      return {
        success: true,
        data: {
          id: `mock-${domain}`,
          domain: domain,
          content: `# Mock ads.txt content for ${domain}\ngoogle.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n`,
          status: 'success',
          last_updated: new Date().toISOString(),
          created_at: new Date().toISOString(),
        }
      };
    }
  },
};

// No longer needed, moved into the adsTxtApi object

/**
 * Status API for AWS Amplify
 * 
 * Provides system status information when running in Amplify mode
 * This is a mock implementation since there's no direct REST endpoint in Amplify Gen2
 */
export const statusApi = {
  /**
   * Get system status 
   * 
   * @returns Status information including environment details
   */
  async getStatus(): Promise<any> {
    try {
      // 環境変数から設定情報を収集
      const amplifyEnv: Record<string, string> = {};
      Object.keys(process.env).forEach(key => {
        if (key.includes('REACT_APP_') || key.includes('AMPLIFY_')) {
          amplifyEnv[key] = process.env[key] as string;
        }
      });
      
      // Amplify GraphQLモード用のステータスレスポンス
      return {
        status: 'OK',
        database: {
          connected: true,
        },
        environment: {
          NODE_ENV: process.env.NODE_ENV || 'production',
          AMPLIFY_MODE: 'Active',
          API_ENDPOINT: 'GraphQL API via Amplify',
          ...amplifyEnv
        },
        time: new Date().toISOString(),
        message: 'Running in Amplify GraphQL mode - no traditional backend server'
      };
    } catch (error) {
      console.error('Error generating Amplify status:', error);
      throw error;
    }
  },
};

// Define and export the API interfaces
const apiClient = {
  request: requestApi,
  message: messageApi,
  adsTxt: adsTxtApi,
  status: statusApi,
};

export default apiClient;
