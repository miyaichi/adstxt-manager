const fs = require('fs');
const path = require('path');

// Warning test for ads.txt records
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
    seller_type: 'PUBLISHER',
  },
};

console.log('Test record with warning:', testRecord);
console.log('Warning key:', testRecord.warning);
console.log('Warning params:', testRecord.warning_params);

// Simulate the frontend translation function
function t(key, language, params) {
  console.log(`Translating key: ${key} with params:`, params);

  // Backend error messages
  const errorMessages = {
    'errors:adsTxtValidation.resellerNotIntermediary': {
      en: 'RESELLER: Seller {{account_id}} is not marked as INTERMEDIARY in sellers.json (current type: {{seller_type}})',
      ja: 'RESELLER: セラー {{account_id}} がsellers.jsonでINTERMEDIARYとしてマークされていません (現在のタイプ: {{seller_type}})',
    },
  };

  const translation = errorMessages[key]?.[language] || errorMessages[key]?.['en'] || key;

  if (params) {
    // Replace parameters in the translation string
    return Object.entries(params).reduce((str, [paramKey, paramValue]) => {
      return str.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue));
    }, translation);
  }

  return translation;
}

// Test the translation
const translated = t(testRecord.warning, 'ja', testRecord.warning_params);
console.log('Translated warning message:', translated);

// Expected output
console.log(
  'Expected output:',
  'RESELLER: セラー 540838151 がsellers.jsonでINTERMEDIARYとしてマークされていません (現在のタイプ: PUBLISHER)'
);
