import React, { createContext, useContext, useState, useEffect } from 'react';

type ThemeType = 'dark' | 'light' | 'system';

interface ThemeContextType {
  theme: ThemeType;
  resolved: 'dark' | 'light';
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeType>(() => {
    const stored = localStorage.getItem('zelos:theme');
    return (stored as ThemeType) || 'system';
  });

  const [resolved, setResolved] = useState<'dark' | 'light'>(() => {
    const stored = localStorage.getItem('zelos:theme') || 'system';
    if (stored === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return stored === 'dark' ? 'dark' : 'light';
  });

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    localStorage.setItem('zelos:theme', newTheme);
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateTheme = () => {
      let activeTheme: 'dark' | 'light' = 'dark';
      if (theme === 'system') {
        activeTheme = mediaQuery.matches ? 'dark' : 'light';
      } else {
        activeTheme = theme === 'dark' ? 'dark' : 'light';
      }
      setResolved(activeTheme);
      document.documentElement.dataset.theme = activeTheme;
    };

    updateTheme();

    const listener = () => {
      if (theme === 'system') {
        updateTheme();
      }
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
