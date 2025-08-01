/**
 * Translation hook
 * Provides a simplified translation function that automatically uses current language
 */

import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';

/**
 * Custom hook for translations that eliminates the need to pass language parameter every time
 * @returns Translation function that uses current language from context
 */
export const useTranslation = () => {
  const { language } = useApp();

  /**
   * Translate a key to current language
   * @param key Translation key (e.g., 'common.status.approved')
   * @param placeholders Optional array of values or object with parameters for placeholder substitution
   * @returns Translated string
   */
  const translate = (key: string, placeholders?: any[] | Record<string, any>): string => {
    return t(key, language, placeholders);
  };

  return translate;
};
