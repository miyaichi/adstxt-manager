import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';

interface AppContextType {
  userEmail: string | null;
  setUserEmail: (email: string | null) => void;
  language: string;
  setLanguage: (language: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

// Get browser language
const getBrowserLanguage = (): string => {
  const browserLanguage = navigator.language.split('-')[0];
  return ['en', 'ja'].includes(browserLanguage) ? browserLanguage : 'en';
};

// Get initial language based on URL param, localStorage, or browser
const getInitialLanguage = (urlLang?: string | null): string => {
  // First priority: URL parameter
  if (urlLang && ['en', 'ja'].includes(urlLang)) {
    localStorage.setItem('userLanguage', urlLang); // Save URL language to localStorage
    return urlLang;
  }

  // Second priority: localStorage
  const savedLanguage = localStorage.getItem('userLanguage');
  if (savedLanguage && ['en', 'ja'].includes(savedLanguage)) {
    return savedLanguage;
  }

  // Last resort: browser language
  return getBrowserLanguage();
};

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [searchParams] = useSearchParams();
  const urlLang = searchParams.get('lang');
  const navigate = useNavigate();
  const location = useLocation();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [language, setLanguageState] = useState<string>(getInitialLanguage(urlLang));

  // Handle language change
  const setLanguage = (newLanguage: string) => {
    if (['en', 'ja'].includes(newLanguage)) {
      setLanguageState(newLanguage);
      localStorage.setItem('userLanguage', newLanguage);
      document.documentElement.lang = newLanguage;

      // Update URL with new language parameter
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('lang', newLanguage);

      // Navigate to the same path but with updated language parameter
      navigate(
        {
          pathname: location.pathname,
          search: newSearchParams.toString(),
        },
        { replace: true }
      );
    }
  };

  // Update language when URL parameter changes
  useEffect(() => {
    if (urlLang && ['en', 'ja'].includes(urlLang) && urlLang !== language) {
      setLanguageState(urlLang);
      localStorage.setItem('userLanguage', urlLang);
      document.documentElement.lang = urlLang;
    }
  }, [urlLang, language]);

  // Update language in HTML tag
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <AppContext.Provider
      value={{
        userEmail,
        setUserEmail,
        language,
        setLanguage,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppContext;
