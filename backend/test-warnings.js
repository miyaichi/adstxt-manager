const fs = require('fs');
const path = require('path');

// ads.txtレコードの警告テスト
const testRecord = {
  domain: 'openx.com',
  account_id: '540838151',
  account_type: 'RESELLER',
  relationship: 'RESELLER',
  has_warning: true,
  warning: 'errors:adsTxtValidation.resellerNotIntermediary',
  warning_params: {
    domain: 'openx.com',
    account_id: '540838151',
    seller_type: 'PUBLISHER'
  }
};

console.log('Test record with warning:', testRecord);
console.log('Warning key:', testRecord.warning);
console.log('Warning params:', testRecord.warning_params);

// フロントエンドの翻訳関数をシミュレート
function t(key, language, params) {
  console.log(`Translating key: ${key} with params:`, params);
  
  // バックエンドのエラーメッセージ
  const errorMessages = {
    'errors:adsTxtValidation.resellerNotIntermediary': {
      en: 'RESELLER: Seller {{account_id}} is not marked as INTERMEDIARY in sellers.json (current type: {{seller_type}})',
      ja: 'RESELLER: セラー {{account_id}} がsellers.jsonでINTERMEDIARYとしてマークされていません (現在のタイプ: {{seller_type}})'
    }
  };
  
  const translation = errorMessages[key]?.[language] || errorMessages[key]?.['en'] || key;
  
  if (params) {
    // パラメータを置換
    return Object.entries(params).reduce((str, [paramKey, paramValue]) => {
      return str.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue));
    }, translation);
  }
  
  return translation;
}

// 翻訳をテスト
const translated = t(testRecord.warning, 'ja', testRecord.warning_params);
console.log('Translated warning message:', translated);

// 期待される出力
console.log('Expected output:', 'RESELLER: セラー 540838151 がsellers.jsonでINTERMEDIARYとしてマークされていません (現在のタイプ: PUBLISHER)');