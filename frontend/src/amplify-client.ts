import { generateClient } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify';
// Try to import the real Amplify outputs, but use mock if not found
import amplifyOutputsJson from './amplify_outputs.json';

// Convert JSON to Amplify config format
const amplifyConfig = {
  API: {
    GraphQL: {
      endpoint: amplifyOutputsJson.data.url,
      region: amplifyOutputsJson.data.aws_region,
      defaultAuthMode: "apiKey", // 強制的にapiKeyを使用
      apiKey: amplifyOutputsJson.data.api_key,
    },
  },
  Auth: {
    Cognito: {
      userPoolId: amplifyOutputsJson.auth.user_pool_id,
      userPoolClientId: amplifyOutputsJson.auth.user_pool_client_id,
      identityPoolId: amplifyOutputsJson.auth.identity_pool_id,
    },
  },
};

// ローカル開発用のモックAWS設定（バックアップ用）
const mockConfig = {
  API: {
    GraphQL: {
      endpoint: process.env.REACT_APP_API_URL || '/api',
      region: 'us-east-1',
      defaultAuthMode: 'apiKey',
      apiKey: 'da2-fakeApiId123456',
    },
  },
  Auth: {
    Cognito: {
      userPoolId: 'mock-user-pool-id',
      userPoolClientId: 'mock-user-pool-client-id',
      identityPoolId: 'mock-identity-pool-id',
    },
  },
};

// 実際の環境に応じた設定を取得
// 本番環境では環境変数を通じてAWS Amplifyから生成されるamplify_outputs.jsonの内容が提供される
const getConfig = () => {
  // 常に最初にJSON設定を試す
  if (amplifyConfig) {
    console.log('Using configuration from amplify_outputs.json');
    return amplifyConfig;
  }
  
  // 環境変数から設定を取得する試み
  if (process.env.REACT_APP_AMPLIFY_CONFIG) {
    try {
      const envConfig = JSON.parse(process.env.REACT_APP_AMPLIFY_CONFIG);
      
      // API Key認証を強制的に有効にする
      if (envConfig.API && envConfig.API.GraphQL) {
        envConfig.API.GraphQL.defaultAuthMode = "apiKey";
      }
      
      console.log('Configured from env vars with API Key:', 
                 envConfig.API?.GraphQL?.apiKey?.substring(0, 5) + '...');
      
      return envConfig;
    } catch (e) {
      console.error('Failed to parse AMPLIFY_CONFIG env var:', e);
    }
  }

  // デフォルトのモック設定を返す
  console.log('Using mock configuration');
  return mockConfig;
};

// Amplify設定の初期化 - v6用に最適化
export const configureAmplify = () => {
  // Amplify Sandboxを使用するためにtrueに設定
  const useAmplifyApi = process.env.REACT_APP_USE_AMPLIFY_API === 'true' || true;
  const config = getConfig();

  console.log('Amplify configuration:', {
    useAmplifyApi,
    apiEndpoint: useAmplifyApi ? config.API?.GraphQL?.endpoint : '/api',
  });

  // Amplify v6の形式に合わせて設定
  const apiConfig = {
    region: amplifyOutputsJson.data.aws_region,
    graphql_endpoint: amplifyOutputsJson.data.url,
    graphql_headers: async () => {
      return {
        'x-api-key': amplifyOutputsJson.data.api_key
      };
    }
  };
  
  try {
    console.log('Configuring Amplify with API endpoint:', apiConfig.graphql_endpoint);
    console.log('Using API key:', amplifyOutputsJson.data.api_key.substring(0, 5) + '...');
    
    // V6形式で設定
    Amplify.configure({
      ...config,
      API: {
        ...config.API,
        GraphQL: {
          endpoint: amplifyOutputsJson.data.url,
          region: amplifyOutputsJson.data.aws_region,
          defaultAuthMode: "apiKey",
          apiKey: amplifyOutputsJson.data.api_key,
        }
      }
    });
  } catch (error) {
    console.error('Error configuring Amplify:', error);
  }
};

// GraphQLクライアントの生成 - 遅延初期化するためにfunctionにする
let _client: ReturnType<typeof generateClient> | null = null;
let _isConfigured = false;

export const client = () => {
  if (!_client) {
    // クライアントが初期化されていない場合は初期化する
    if (!_isConfigured) {
      console.log('Amplify config not found, initializing...');
      configureAmplify();
      _isConfigured = true;
    }
    
    // APIキーを直接使用
    const apiKey = amplifyOutputsJson.data.api_key;
    
    // APIキーを使った認証を明示的に指定
    _client = generateClient({
      authMode: 'apiKey',
      apiKey: apiKey
    });
    
    console.log(`Using API Key: ${apiKey?.substring(0, 5)}...`);
    
    console.log('GraphQL client initialized with apiKey auth mode');
  }
  return _client;
};

// 現在のAPIキーの取得
export const getCurrentApiKey = async () => {
  try {
    const session = await fetchAuthSession();
    return session.userSub;
  } catch (error) {
    console.error('Error fetching session:', error);
    return null;
  }
};

// REST APIとGraphQL APIを切り替えるためのフラグ
export const isAmplifyApiEnabled = () => {
  // デフォルトでAmplify APIを有効化
  return process.env.REACT_APP_USE_AMPLIFY_API === 'true' || true;
};
