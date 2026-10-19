import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../db/db';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  brandName: string;
  setBrandName: (name: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('system');
  const [brandName, setBrandNameState] = useState<string>('PrepVault');
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    // Load initial settings from Dexie
    const loadSettings = async () => {
      try {
        const s = await db.settings.get('app-settings');
        if (s) {
          if (s.theme) setThemeState(s.theme);
          if (s.brandName) setBrandNameState(s.brandName);
        }
      } catch (err) {
        console.error('Failed to load theme settings from DB:', err);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      let activeIsDark = false;
      if (theme === 'dark') {
        activeIsDark = true;
      } else if (theme === 'light') {
        activeIsDark = false;
      } else {
        activeIsDark = mediaQuery.matches;
      }

      setIsDark(activeIsDark);
      if (activeIsDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();

    const listener = () => {
      if (theme === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      const s = await db.settings.get('app-settings');
      if (s) {
        await db.settings.update('app-settings', { theme: newTheme });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const setBrandName = async (newName: string) => {
    setBrandNameState(newName);
    try {
      const s = await db.settings.get('app-settings');
      if (s) {
        await db.settings.update('app-settings', { brandName: newName });
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme, brandName, setBrandName }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
