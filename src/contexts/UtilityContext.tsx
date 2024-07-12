import React, { createContext, useContext, ReactNode } from 'react';

interface UtilityContextType {
  trunc: (str: string, n?: number) => string;
}

const UtilityContext = createContext<UtilityContextType | undefined>(undefined);

const trunc = (str: string, n: number = 40): string => (str.length > n ? str.slice(0, n - 1) + '…' : str);

interface UtilityProviderProps {
  children: ReactNode;
}

export const UtilityProvider: React.FC<UtilityProviderProps> = ({ children }) => {
  return (
    <UtilityContext.Provider value={{ trunc }}>
      {children}
    </UtilityContext.Provider>
  );
};

export const useUtility = (): UtilityContextType => {
  const context = useContext(UtilityContext);
  if (!context) {
    throw new Error('useUtility must be used within a UtilityProvider');
  }
  return context;
};
