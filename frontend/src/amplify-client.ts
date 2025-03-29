import { generateClient } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify';
import amplifyOutputsJson from './amplify_outputs.json';

/**
 * AWS Amplify Gen2 クライアント設定
 * このモジュールはAmplify Gen2 API へのアクセスを管理します
 */

// AmplifyのJSON出力から設定を生成
const amplifyConfig = {
  API: {
    GraphQL: {
      endpoint: amplifyOutputsJson.data.url,
      region: amplifyOutputsJson.data.aws_region,
      defaultAuthMode: "apiKey",
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

// ローカル開発用モック設定
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

/**
 * 環境に応じた設定を取得
 * 優先順位: amplify_outputs.json > 環境変数 > モック設定
 */
const getConfig = () => {
  // JSON設定を優先
  if (amplifyConfig) {
    return amplifyConfig;
  }
  
  // 環境変数から設定を取得
  if (process.env.REACT_APP_AMPLIFY_CONFIG) {
    try {
      const envConfig = JSON.parse(process.env.REACT_APP_AMPLIFY_CONFIG);
      
      // API Key認証を有効化
      if (envConfig.API && envConfig.API.GraphQL) {
        envConfig.API.GraphQL.defaultAuthMode = "apiKey";
      }
      
      return envConfig;
    } catch (e) {
      console.error('Failed to parse AMPLIFY_CONFIG env var:', e);
    }
  }

  // フォールバック: モック設定
  return mockConfig;
};

/**
 * Amplify設定を初期化
 */
export const configureAmplify = () => {
  const config = getConfig();
  
  try {
    // Amplify v6形式で設定
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

// GraphQLクライアントの遅延初期化
let _client: ReturnType<typeof generateClient> | null = null;
let _isConfigured = false;

/**
 * GraphQLクライアントを取得（シングルトンパターン）
 */
export const client = () => {
  if (!_client) {
    // 初回アクセス時に設定
    if (!_isConfigured) {
      configureAmplify();
      _isConfigured = true;
    }
    
    // APIキーを設定
    const apiKey = amplifyOutputsJson.data.api_key;
    
    // クライアント生成
    _client = generateClient({
      authMode: 'apiKey',
      apiKey: apiKey
    });
  }
  return _client;
};

/**
 * 現在のAPI認証情報を取得
 */
export const getCurrentApiKey = async () => {
  try {
    const session = await fetchAuthSession();
    return session.userSub;
  } catch (error) {
    console.error('Error fetching session:', error);
    return null;
  }
};

/**
 * Amplifyモードのステータスを確認
 */
export const isAmplifyApiEnabled = () => {
  return process.env.REACT_APP_USE_AMPLIFY_API === 'true' || true;
};
