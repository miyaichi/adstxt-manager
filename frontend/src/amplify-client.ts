import { generateClient } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify';

// ローカル開発用のモックAWS設定
const mockConfig = {
  API: {
    GraphQL: {
      endpoint: process.env.REACT_APP_API_URL || '/api',
      region: 'us-east-1',
      defaultAuthMode: 'apiKey',
      apiKey: 'da2-fakeApiId123456'
    }
  },
  Auth: {
    Cognito: {
      userPoolId: 'mock-user-pool-id',
      userPoolClientId: 'mock-user-pool-client-id',
      identityPoolId: 'mock-identity-pool-id'
    }
  }
};

// 実際の環境に応じた設定を取得
// 本番環境では環境変数を通じてAWS Amplifyから生成されるamplify_outputs.jsonの内容が提供される
const getConfig = () => {
  // 環境変数から設定を取得する試み
  if (process.env.REACT_APP_AMPLIFY_CONFIG) {
    try {
      return JSON.parse(process.env.REACT_APP_AMPLIFY_CONFIG);
    } catch (e) {
      console.error('Failed to parse AMPLIFY_CONFIG env var:', e);
    }
  }
  
  // デフォルトのモック設定を返す
  return mockConfig;
};

// Amplify設定の初期化
export const configureAmplify = () => {
  const useAmplifyApi = process.env.REACT_APP_USE_AMPLIFY_API === 'true';
  const config = getConfig();
  
  console.log('Amplify configuration:', {
    useAmplifyApi,
    apiEndpoint: useAmplifyApi ? config.API?.GraphQL?.endpoint : '/api'
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
export const useAmplifyApi = () => {
  return process.env.REACT_APP_USE_AMPLIFY_API === 'true';
};