import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Appearance, StatusBar } from 'react-native';
import { useMMKVBoolean } from 'react-native-mmkv';
import { storage } from '@/utils/storage';

// Updated ThemeContextType to include currentTheme
type ThemeContextType = {
    isDarkMode: boolean | undefined;
    setDarkMode: (value: boolean | undefined) => void;
    useSystemTheme: () => void;
    currentTheme: 'light' | 'dark';
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

    const getCurrentTheme = useCallback((): 'light' | 'dark' => {
        if (isDarkMode === undefined) {
            return systemTheme; // Use system theme if isDarkMode is undefined
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

    useEffect(() => {
        setCurrentTheme(getCurrentTheme());

        // This will only save the preference, not change the system appearance
        if (isDarkMode !== undefined) {
            storage.set('dark-mode', isDarkMode);
        }
    }, [isDarkMode, getCurrentTheme]); // Only `isDarkMode` is a dependency now

    const setDarkMode = (value: boolean | undefined) => {
        setIsDarkMode(value);
        if (value !== undefined) {
            storage.set('dark-mode', value);
        }
    };

    const useSystemTheme = () => {
        setIsDarkMode(undefined);
        storage.delete('dark-mode');
    };

    return (
        <ThemeContext.Provider value={{ isDarkMode, setDarkMode, useSystemTheme, currentTheme }}>
            <StatusBar barStyle={currentTheme === 'dark' ? 'light-content' : 'dark-content'} />
            {children}
        </ThemeContext.Provider>
    );
};