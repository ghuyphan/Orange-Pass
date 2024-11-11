import React, { createContext, useContext, useEffect } from 'react';
import { Appearance, StatusBar, useColorScheme } from 'react-native';
import { useMMKVBoolean } from 'react-native-mmkv';
import { storage } from '@/utils/storage';

type ThemeContextType = {
  isDarkMode: boolean | undefined;
  currentTheme: 'light' | 'dark';
  toggleTheme: () => void;
  setDarkMode: (value: boolean) => void;
  useSystemTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  // Load the user's theme preference from MMKV storage
  const [isDarkMode, setIsDarkMode] = useMMKVBoolean('dark-mode', storage);
  const systemColorScheme = useColorScheme();

  // Determine the current theme: use the system theme if `isDarkMode` is undefined
  const currentTheme =
    isDarkMode === undefined ? (systemColorScheme === 'dark' ? 'dark' : 'light') : isDarkMode ? 'dark' : 'light';

  // Update the StatusBar based on the current theme
  useEffect(() => {
    StatusBar.setBarStyle(currentTheme === 'dark' ? 'light-content' : 'dark-content');
  }, [currentTheme]);

  // Toggle between light and dark mode manually
  const toggleTheme = () => {
    if (isDarkMode !== undefined) {
      setIsDarkMode(!isDarkMode);
    } else {
      setIsDarkMode(systemColorScheme !== 'dark');
    }
  };

  // Force set dark mode or light mode
  const setDarkMode = (value: boolean) => {
    setIsDarkMode(value);
  };

  // Function to reset to system theme
  const useSystemTheme = () => {
    setIsDarkMode(undefined);
    storage.delete('dark-mode');
  };

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode,
        currentTheme,
        toggleTheme,
        setDarkMode,
        useSystemTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
