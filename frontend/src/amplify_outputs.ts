// Amplify Gen2から生成された設定
// このファイルは自動生成され、`npx ampx sandbox`コマンドの出力に基づいています

const config = {
  // APIエンドポイント
  API: {
    GraphQL: {
      endpoint:
        'https://2hcjucdhardfrjxov4pdhcepoe.appsync-api.ap-northeast-1.amazonaws.com/graphql',
      region: 'ap-northeast-1',
      defaultAuthMode: 'apiKey',
      apiKey: 'da2-q3gadcagtbg2nch3ag3hmftjbe',
    },
  },
  // 認証設定
  Auth: {
    Cognito: {
      userPoolId: 'ap-northeast-1_L0KtkNk7E',
      userPoolClientId: '4gvef8d907j6p9tv1adlbpfb96',
      identityPoolId: 'ap-northeast-1:5e60ea32-d4b0-48a4-9e33-4b4c58c7ffd8',
      signUpVerificationMethod: 'email',
      loginWith: {
        email: true,
        phone: false,
        username: false,
      },
      mfa: {
        status: 'OFF',
        totpEnabled: false,
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
