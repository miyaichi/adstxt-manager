import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

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

// Get initial language - from localStorage or browser
const getInitialLanguage = (): string => {
  const savedLanguage = localStorage.getItem('userLanguage');
  if (savedLanguage && ['en', 'ja'].includes(savedLanguage)) {
    return savedLanguage;
  }

  const browserLanguage = navigator.language.split('-')[0];
  return ['en', 'ja'].includes(browserLanguage) ? browserLanguage : 'en';
};

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [language, setLanguageState] = useState<string>(getInitialLanguage());

  // Handle language change
  const setLanguage = (newLanguage: string) => {
    if (['en', 'ja'].includes(newLanguage)) {
      setLanguageState(newLanguage);
      localStorage.setItem('userLanguage', newLanguage);

      // This will help axios interceptor use the new language
      document.documentElement.lang = newLanguage;
    }
  };

  // Update language in HTML tag
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <AppContext.Provider value={{ userEmail, setUserEmail, language, setLanguage }}>
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
