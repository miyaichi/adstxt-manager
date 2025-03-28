import { defineAuth } from '@aws-amplify/backend';

// APIキーのみを使用する最小限の認証設定
export const auth = defineAuth({
  loginWith: {
    email: false,
    username: false,
  }
});