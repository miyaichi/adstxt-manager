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
      defaultAuthMode: amplifyOutputsJson.data.default_authorization_type === "API_KEY" ? "apiKey" : amplifyOutputsJson.data.default_authorization_type,
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
      return JSON.parse(process.env.REACT_APP_AMPLIFY_CONFIG);
    } catch (e) {
      console.error('Failed to parse AMPLIFY_CONFIG env var:', e);
    }
  }

  // デフォルトのモック設定を返す
  console.log('Using mock configuration');
  return mockConfig;
};

// Amplify設定の初期化
export const configureAmplify = () => {
  // Amplify Sandboxを使用するためにtrueに設定
  const useAmplifyApi = process.env.REACT_APP_USE_AMPLIFY_API === 'true' || true;
  const config = getConfig();

  console.log('Amplify configuration:', {
    useAmplifyApi,
    apiEndpoint: useAmplifyApi ? config.API?.GraphQL?.endpoint : '/api',
  });

  Amplify.configure(config);
};

// GraphQLクライアントの生成
export const client = generateClient();

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
