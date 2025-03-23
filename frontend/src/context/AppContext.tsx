import React, { createContext, useState, useContext, ReactNode } from 'react';

interface AppContextType {
  userEmail: string | null;
  setUserEmail: (email: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [userEmail, setUserEmail] = useState<string | null>(null);

  return <AppContext.Provider value={{ userEmail, setUserEmail }}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppContext;
