import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';

// バックエンド定義のエクスポート
export const backend = defineBackend({
  auth,
  data,
});