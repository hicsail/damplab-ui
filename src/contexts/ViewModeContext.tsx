import { createContext, useState, useCallback, useContext } from 'react';

interface ViewModeContextProps {
  isClientView: boolean;
  toggleViewMode: () => void;
}

export const ViewModeContext = createContext<ViewModeContextProps>({
  isClientView: false,
  toggleViewMode: () => {},
});

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
  const [isClientView, setIsClientView] = useState(false);
  const toggleViewMode = useCallback(() => setIsClientView((prev) => !prev), []);

  return (
    <ViewModeContext value={{ isClientView, toggleViewMode }}>
      {children}
    </ViewModeContext>
  );
}
