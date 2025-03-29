// モックAmplify Gen2設定
// 実際にデプロイする際は、ampxを使用して生成されたファイルに置き換える必要があります

const config = {
  // APIエンドポイント
  API: {
    GraphQL: {
      endpoint: 'http://localhost:4000/api', // バックエンドのAPIエンドポイント
      region: 'us-east-1',
      defaultAuthMode: 'apiKey',
      apiKey: 'dummy-api-key-for-local-development',
    },
  },
  // 認証設定
  Auth: {
    Cognito: {
      userPoolId: 'local-userpool-id',
      userPoolClientId: 'local-userpool-client-id',
      identityPoolId: 'local-identity-pool-id',
      signUpVerificationMethod: 'code',
      loginWith: {
        email: true,
        phone: false,
        username: false,
      },
      mfa: {
        status: 'optional',
        totpEnabled: true,
      },
      passwordFormat: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialCharacters: true,
      },
    },
  },
};

export default config;
