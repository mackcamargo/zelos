import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { dbService } from '../lib/supabase';

type ThemeType = 'dark' | 'light' | 'system';

interface ThemeContextType {
  theme: ThemeType;
  resolved: 'dark' | 'light';
  setTheme: (theme: ThemeType) => void;
  syncUserTheme: (userId: string | null, dbTemaPreferido?: string | null) => void;
  activeUserId: string | null;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const activeUserIdRef = useRef<string | null>(null);
  activeUserIdRef.current = activeUserId;

  const [theme, setThemeState] = useState<ThemeType>('light');
  const [resolved, setResolved] = useState<'dark' | 'light'>('light');

  const parseThemeValue = (val?: string | null): 'dark' | 'light' => {
    if (!val) return 'light'; // Default is 'claro' ('light')
    if (val === 'claro' || val === 'light') return 'light';
    if (val === 'escuro' || val === 'dark') return 'dark';
    if (val === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  };

  const applyThemeToDOM = (resolvedTheme: 'dark' | 'light') => {
    setResolved(resolvedTheme);
    document.documentElement.dataset.theme = resolvedTheme;
  };

  // Called when user logs in, profile changes, or user logs out
  const syncUserTheme = (userId: string | null, dbTemaPreferido?: string | null) => {
    setActiveUserId(userId);
    activeUserIdRef.current = userId;

    // Remove legacy generic non-user-specific theme keys
    localStorage.removeItem('zelos:theme');
    localStorage.removeItem('theme');

    if (!userId) {
      // Unauthenticated state
      const fallback = 'dark';
      setThemeState(fallback);
      applyThemeToDOM(fallback);
      return;
    }

    // Per-user localStorage cache key
    const cacheKey = `theme:${userId}`;
    const cached = localStorage.getItem(cacheKey);

    let chosen: 'dark' | 'light';

    if (dbTemaPreferido) {
      // Database value from profiles.tema_preferido is the source of truth
      chosen = parseThemeValue(dbTemaPreferido);
      localStorage.setItem(cacheKey, chosen);
    } else if (cached) {
      // Fallback to per-user cache
      chosen = parseThemeValue(cached);
    } else {
      // Default fallback for new profiles: 'claro' ('light')
      chosen = 'light';
      localStorage.setItem(cacheKey, chosen);
    }

    setThemeState(chosen);
    applyThemeToDOM(chosen);
  };

  // User manual theme change (e.g. Sun/Moon button or Theme selector)
  const setTheme = (newTheme: ThemeType) => {
    let nextResolved: 'dark' | 'light';

    if (newTheme === 'system') {
      nextResolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      nextResolved = newTheme === 'dark' ? 'dark' : 'light';
    }

    setThemeState(newTheme);
    applyThemeToDOM(nextResolved);

    const uid = activeUserIdRef.current;
    if (uid) {
      const cacheKey = `theme:${uid}`;
      localStorage.setItem(cacheKey, nextResolved);

      // Persist to Supabase profiles.tema_preferido ('claro' | 'escuro')
      const dbVal = nextResolved === 'light' ? 'claro' : 'escuro';
      dbService.updateProfileTheme(uid, dbVal).catch((err) => {
        console.error('Erro ao atualizar tema no Supabase:', err);
      });
    }
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      if (theme === 'system') {
        const nextResolved = mediaQuery.matches ? 'dark' : 'light';
        applyThemeToDOM(nextResolved);
      }
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme, syncUserTheme, activeUserId }}>
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
