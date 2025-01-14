import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Appearance, StatusBar, Platform } from 'react-native';
import { useMMKVBoolean } from 'react-native-mmkv';
import { storage } from '@/utils/storage';
import * as NavigationBar from 'expo-navigation-bar';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  isDarkMode: boolean | undefined;
  setDarkMode: (value: boolean | undefined) => void;
  useSystemTheme: () => void;
  currentTheme: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const NAVIGATION_BAR_COLORS = {
  light: {
    background: '#FAFAFA',
    button: 'dark' as const,
  },
  dark: {
    background: '#121212',
    button: 'light' as const,
  },
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useMMKVBoolean('dark-mode', storage);
  const [systemTheme, setSystemTheme] = useState<Theme>(() => 
    Appearance.getColorScheme() || 'light'
  );

  const currentTheme = useMemo((): Theme => 
    isDarkMode === undefined ? systemTheme : (isDarkMode ? 'dark' : 'light'),
    [isDarkMode, systemTheme]
  );

  const setNavigationBarColor = useCallback(async (theme: Theme) => {
    if (Platform.OS !== 'android') return;

    const colors = NAVIGATION_BAR_COLORS[theme];
    try {
      await Promise.all([
        NavigationBar.setBackgroundColorAsync(colors.background),
        NavigationBar.setButtonStyleAsync(colors.button)
      ]);
    } catch (error) {
      console.error('Error setting navigation bar color:', error);
    }
  }, []);

  useEffect(() => {
    const updateSystemTheme = () => {
      const newTheme = Appearance.getColorScheme() || 'light';
      setSystemTheme(newTheme as Theme);
      
      if (isDarkMode === undefined) {
        setNavigationBarColor(newTheme as Theme);
      }
    };

    const subscription = Appearance.addChangeListener(updateSystemTheme);
    return () => subscription.remove();
  }, [isDarkMode, setNavigationBarColor]);

  useEffect(() => {
    setNavigationBarColor(currentTheme);
  }, [currentTheme, setNavigationBarColor]);

  const themeContextValue = useMemo((): ThemeContextType => ({
    isDarkMode,
    setDarkMode: (value: boolean | undefined) => {
      setIsDarkMode(value);
      if (value !== undefined) {
        storage.set('dark-mode', value);
      }
    },
    useSystemTheme: () => {
      setIsDarkMode(undefined);
      storage.delete('dark-mode');
    },
    currentTheme
  }), [isDarkMode, currentTheme]);

  return (
    <ThemeContext.Provider value={themeContextValue}>
      <StatusBar barStyle={currentTheme === 'dark' ? 'light-content' : 'dark-content'} />
      {children}
    </ThemeContext.Provider>
  );
};