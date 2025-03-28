import { defineAuth } from '@aws-amplify/backend';

// シンプルな認証設定
export const auth = defineAuth({
  loginWith: {
    email: true,
  }
});