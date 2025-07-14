/**
 * Language detection utility
 * Provides centralized language detection logic for the application
 */

const SUPPORTED_LANGUAGES = ['en', 'ja'] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Detects user's preferred language based on priority:
 * 1. URL parameter (?lang=en|ja)
 * 2. SessionStorage preference
 * 3. Browser language (navigator.language)
 * 4. Default fallback ('en')
 */
export const detectLanguage = (): SupportedLanguage => {
  // Priority 1: URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const urlLang = urlParams.get('lang');
  if (urlLang && SUPPORTED_LANGUAGES.includes(urlLang as SupportedLanguage)) {
    return urlLang as SupportedLanguage;
  }

  // Priority 2: SessionStorage
  const storedLang = sessionStorage.getItem('userLanguage');
  if (storedLang && SUPPORTED_LANGUAGES.includes(storedLang as SupportedLanguage)) {
    return storedLang as SupportedLanguage;
  }

  // Priority 3: Browser language
  const browserLang = navigator.language.split('-')[0];
  if (SUPPORTED_LANGUAGES.includes(browserLang as SupportedLanguage)) {
    return browserLang as SupportedLanguage;
  }

  // Priority 4: Default fallback
  return 'en';
};

/**
 * Checks if a language code is supported by the application
 */
export const isSupportedLanguage = (lang: string): lang is SupportedLanguage => {
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
};

/**
 * Gets the current language and persists URL parameter to sessionStorage if present
 */
export const getInitialLanguage = (): SupportedLanguage => {
  const language = detectLanguage();

  // Save URL language parameter to sessionStorage for persistence
  const urlParams = new URLSearchParams(window.location.search);
  const urlLang = urlParams.get('lang');
  if (urlLang && isSupportedLanguage(urlLang)) {
    sessionStorage.setItem('userLanguage', urlLang);
  }

  return language;
};

/**
 * Sets language preference and persists to sessionStorage
 */
export const setLanguagePreference = (language: SupportedLanguage): void => {
  sessionStorage.setItem('userLanguage', language);
  document.documentElement.lang = language;
};
