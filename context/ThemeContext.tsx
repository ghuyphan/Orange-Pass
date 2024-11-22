import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Appearance, StatusBar } from 'react-native';
import { useMMKVBoolean } from 'react-native-mmkv';
import { storage } from '@/utils/storage';

type ThemeContextType = {
    isDarkMode: boolean | undefined;
    setDarkMode: (value: boolean | undefined) => void; 
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

    // useCallback for getCurrentTheme to prevent unnecessary re-creation
    const getCurrentTheme = useCallback((): 'light' | 'dark' => {
        if (isDarkMode === undefined) {
            return systemTheme;
        }
        return isDarkMode ? 'dark' : 'light';
    }, [isDarkMode, systemTheme]);

    const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(getCurrentTheme());

    useEffect(() => {
        const updateSystemTheme = () => {
            const colorScheme = Appearance.getColorScheme();
            setSystemTheme(colorScheme === 'dark' ? 'dark' : 'light');
        };

        const listener = Appearance.addChangeListener(updateSystemTheme);
        return () => listener.remove();
    }, []);

    // useCallback for the effect callback to prevent unnecessary re-creation
    const updateThemeEffect = useCallback(() => {
        const newTheme = getCurrentTheme();
        setCurrentTheme(newTheme);

        if (isDarkMode !== undefined) {
            storage.set('dark-mode', isDarkMode);
            Appearance.setColorScheme(newTheme);
        }
    }, [getCurrentTheme, isDarkMode]);

    useEffect(updateThemeEffect, [updateThemeEffect]); 

    useEffect(() => {
        StatusBar.setBarStyle(currentTheme === 'dark' ? 'light-content' : 'dark-content');
    }, [currentTheme]);

    // Function to explicitly set dark mode and update storage
    const setDarkMode = (value: boolean | undefined) => { 
        setIsDarkMode(value);
        storage.set('dark-mode', value);
    };

    // Function to switch to system theme and clear storage
    const useSystemTheme = () => {
        setIsDarkMode(undefined); 
        storage.delete('dark-mode');
    };

    return (
        <ThemeContext.Provider value={{ isDarkMode, setDarkMode, useSystemTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};