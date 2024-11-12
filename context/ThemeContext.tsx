import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance, StatusBar } from 'react-native';
import { useMMKVBoolean } from 'react-native-mmkv';
import { storage } from '@/utils/storage';

type ThemeContextType = {
    isDarkMode: boolean | undefined;
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
    const [isDarkMode, setIsDarkMode] = useMMKVBoolean('dark-mode', storage);
    const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(Appearance.getColorScheme() || 'light');

    const getCurrentTheme = (): 'light' | 'dark' => {
        if (isDarkMode === undefined) {
            return systemTheme;
        }
        return isDarkMode ? 'dark' : 'light';
    };

    const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(getCurrentTheme());

    // Listen for system theme changes and update accordingly
    useEffect(() => {
        const updateSystemTheme = () => {
            const colorScheme = Appearance.getColorScheme();
            setSystemTheme(colorScheme === 'dark' ? 'dark' : 'light');
        };

        const listener = Appearance.addChangeListener(updateSystemTheme);
        return () => listener.remove();
    }, []);

    // Update theme based on user preference or system theme changes
    useEffect(() => {
        const newTheme = getCurrentTheme();
        setCurrentTheme(newTheme);

        // Update the MMKV storage if the theme changes
        if (isDarkMode !== undefined) {
            storage.set('dark-mode', isDarkMode);
            Appearance.setColorScheme(newTheme);
        }
    }, [isDarkMode]);

    // Update the StatusBar style based on the current theme
    useEffect(() => {
        StatusBar.setBarStyle(currentTheme === 'dark' ? 'light-content' : 'dark-content');
    }, [currentTheme]);

    // Function to explicitly set dark mode and update storage
    const setDarkMode = (value: boolean) => {
        setIsDarkMode(value);
        storage.set('dark-mode', value);
    };

    // Function to switch to system theme and clear storage
    const useSystemTheme = () => {
        storage.delete('dark-mode');
    };

    return (
        <ThemeContext.Provider value={{ isDarkMode, setDarkMode, useSystemTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
