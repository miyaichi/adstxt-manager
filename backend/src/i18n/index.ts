import i18next from 'i18next';
import { join } from 'path';
import Backend from 'i18next-fs-backend';
import middleware from 'i18next-http-middleware';

// Initialize i18next
i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    backend: {
      loadPath: join(__dirname, '/locales/{{lng}}/{{ns}}.json'),
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'ja'],
    ns: ['common', 'errors', 'email'],
    defaultNS: 'common',
    preload: ['en', 'ja'],
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
  });

export default i18next;
