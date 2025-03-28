import { generateClient } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify';
import config from '../amplify_outputs';

// Amplify設定の初期化
export const configureAmplify = () => {
  const useAmplifyApi = process.env.REACT_APP_USE_AMPLIFY_API === 'true';
  
  console.log('Amplify configuration:', {
    useAmplifyApi,
    apiEndpoint: useAmplifyApi ? config.api?.GraphQL.endpoint : '/api'
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