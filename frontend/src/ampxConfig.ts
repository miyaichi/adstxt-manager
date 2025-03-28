import { Amplify } from 'aws-amplify';
import config from './amplify_outputs';

// アプリケーション起動時に一度だけ呼び出す
export const configureAmplify = () => {
  const useAmplifyApi = process.env.REACT_APP_USE_AMPLIFY_API === 'true';
  
  // デバッグ情報を出力
  console.log('Amplify configuration:', {
    useAmplifyApi,
    apiEndpoint: config.API.GraphQL.endpoint
  });
  
  if (useAmplifyApi) {
    // Amplify Gen2 APIを使用する場合
    Amplify.configure(config);
    console.log('Amplify Gen2 API configured');
  } else {
    // 既存のREST APIのみを使用する場合
    // 認証設定のみ適用
    Amplify.configure({
      Auth: config.Auth
    });
    console.log('Amplify Auth configured (REST API will be used)');
  }
};