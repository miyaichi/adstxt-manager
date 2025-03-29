import { defineConfig } from '@aws-amplify/backend';

export const config = defineConfig({
  region: 'us-east-1', // リージョン設定
  stackName: 'adstxt-manager', // カスタムスタック名
  sandbox: {
    // サンドボックス設定
    autoSave: true,
  },
});