import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { getInitialLanguage, isSupportedLanguage, setLanguagePreference } from '../utils/language';

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

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [searchParams] = useSearchParams();
  const urlLang = searchParams.get('lang');
  const navigate = useNavigate();
  const location = useLocation();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [language, setLanguageState] = useState<string>(getInitialLanguage());

  // Handle language change
  const setLanguage = (newLanguage: string) => {
    if (isSupportedLanguage(newLanguage)) {
      setLanguageState(newLanguage);
      setLanguagePreference(newLanguage);

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
    if (urlLang && isSupportedLanguage(urlLang) && urlLang !== language) {
      setLanguageState(urlLang);
      setLanguagePreference(urlLang);
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
