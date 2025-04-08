import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

interface AppContextType {
  userEmail: string | null;
  setUserEmail: (email: string | null) => void;
  language: string;
  setLanguage: (language: string) => void;
  useSystemLanguage: boolean;
  setUseSystemLanguage: (useSystemLanguage: boolean) => void;
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

// Get initial language - from localStorage or browser
const getInitialLanguage = (): { language: string; useSystemLanguage: boolean } => {
  const useSystemLanguage = localStorage.getItem('useSystemLanguage') === 'true';

  if (useSystemLanguage) {
    return { language: getBrowserLanguage(), useSystemLanguage: true };
  }

  const savedLanguage = localStorage.getItem('userLanguage');
  if (savedLanguage && ['en', 'ja'].includes(savedLanguage)) {
    return { language: savedLanguage, useSystemLanguage: false };
  }

  // Default: use browser language
  return { language: getBrowserLanguage(), useSystemLanguage: true };
};

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const initialState = getInitialLanguage();
  const [language, setLanguageState] = useState<string>(initialState.language);
  const [useSystemLanguage, setUseSystemLanguageState] = useState<boolean>(
    initialState.useSystemLanguage
  );

  // Handle language change
  const setLanguage = (newLanguage: string) => {
    if (['en', 'ja'].includes(newLanguage)) {
      setLanguageState(newLanguage);
      localStorage.setItem('userLanguage', newLanguage);
      // When manually selecting a language, turn off system language
      setUseSystemLanguageState(false);
      localStorage.setItem('useSystemLanguage', 'false');
      // This will help axios interceptor use the new language
      document.documentElement.lang = newLanguage;
    }
  };

  // Handle system language preference toggle
  const setUseSystemLanguage = (value: boolean) => {
    setUseSystemLanguageState(value);
    localStorage.setItem('useSystemLanguage', value.toString());

    if (value) {
      // Update to browser language immediately
      const browserLang = getBrowserLanguage();
      setLanguageState(browserLang);
      document.documentElement.lang = browserLang;
    }
  };

  // Check for browser language changes when using system setting
  useEffect(() => {
    if (!useSystemLanguage) return;

    const handleLanguageChange = () => {
      const newLang = getBrowserLanguage();
      setLanguageState(newLang);
      document.documentElement.lang = newLang;
    };

    // Initial check
    handleLanguageChange();

    // There's no direct event for language changes, but we can periodically check
    // This is a workaround as browsers don't emit events for language changes
    const intervalId = setInterval(handleLanguageChange, 5000);

    return () => clearInterval(intervalId);
  }, [useSystemLanguage]);

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
        useSystemLanguage,
        setUseSystemLanguage,
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
