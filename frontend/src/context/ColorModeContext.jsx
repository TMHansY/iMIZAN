import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { createAppTheme } from '../theme/DefaultColors';

export const COLOR_MODE_KEY = 'imizan-color-mode';
const ColorModeContext = createContext(null);

function initialMode() {
  try {
    const saved = window.localStorage.getItem(COLOR_MODE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Theme switching remains available when browser storage is blocked.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ColorModeProvider({ children }) {
  const [mode, setMode] = useState(initialMode);
  const toggleMode = useCallback(
    () => setMode((current) => (current === 'light' ? 'dark' : 'light')),
    [],
  );
  useEffect(() => {
    try {
      window.localStorage.setItem(COLOR_MODE_KEY, mode);
    } catch {
      // The current session can still use the selected theme.
    }
  }, [mode]);
  const theme = useMemo(() => createAppTheme(mode), [mode]);
  const value = useMemo(() => ({ mode, toggleMode }), [mode, toggleMode]);
  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export const useColorMode = () => useContext(ColorModeContext);
