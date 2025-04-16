import i18next from 'i18next';
import { join } from 'path';
import Backend from 'i18next-fs-backend';
import middleware from 'i18next-http-middleware';
import fs from 'fs';
import path from 'path';

// 開発環境と本番環境で正しいパスを取得する関数
function getLocalesPath() {
  // 可能性のあるパス
  const possiblePaths = [
    join(__dirname, '/locales'),
    join(__dirname, '../locales'),
    join(__dirname, '../i18n/locales'),
    join(__dirname, '../src/i18n/locales'),
    join(process.cwd(), 'dist/i18n/locales'),
    join(process.cwd(), 'src/i18n/locales'),
  ];

  console.log('[i18n] Looking for locales in the following paths:');

  // 最初に見つかったパスを使用
  for (const p of possiblePaths) {
    try {
      console.log(`[i18n] Checking: ${p}`);
      // ディレクトリが存在するか確認
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
        // en と ja の両方のディレクトリがあるか確認
        const hasEn = fs.existsSync(join(p, 'en'));
        const hasJa = fs.existsSync(join(p, 'ja'));

        if (hasEn && hasJa) {
          console.log(`[i18n] ✅ Found valid locales directory: ${p}`);
          // en/email.json が存在するか確認
          const hasEmailJson = fs.existsSync(join(p, 'en/email.json'));
          if (hasEmailJson) {
            console.log('[i18n] ✅ Found email.json file');
          } else {
            console.log('[i18n] ⚠️ email.json file not found');
          }
          return p;
        }
      }
    } catch (e) {
      // エラーは無視して次のパスを試す
    }
  }

  // 見つからなかった場合はデフォルトパスを返す
  console.log('[i18n] ⚠️ No valid locales directory found, using default path');
  return join(__dirname, '/locales');
}

const localesPath = getLocalesPath();

// Initialize i18next
i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    backend: {
      loadPath: join(localesPath, '{{lng}}/{{ns}}.json'),
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'ja'],
    ns: ['common', 'errors', 'email'],
    defaultNS: 'common',
    preload: ['en', 'ja'],
    debug: true, // デバッグモードを有効化
    detection: {
      // Order of lookup for language
      order: ['querystring', 'header'], // First check URL query parameter, then HTTP header
      // Options for language lookup
      lookupQuerystring: 'lang', // Check lang parameter in URL query string
      lookupHeader: 'accept-language', // Also check Accept-Language header
      // Cache user language
      caches: ['cookie'],
      // Set cookie configuration
      cookieExpirationDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), // 1 year
      cookieDomain: 'localhost',
    },
  })
  .then(() => {
    console.log('[i18n] Successfully initialized with languages:', i18next.languages);
    console.log('[i18n] Using locales path:', localesPath);
  })
  .catch((err) => {
    console.error('[i18n] Failed to initialize:', err);
  });

export default i18next;
