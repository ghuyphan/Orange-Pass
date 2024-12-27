import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Appearance, StatusBar, Platform } from 'react-native';
import { useMMKVBoolean } from 'react-native-mmkv';
import { storage } from '@/utils/storage';
import * as NavigationBar from 'expo-navigation-bar';

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

    const setNavigationBarColor = useCallback(async (theme: 'light' | 'dark') => {
        if (Platform.OS === 'android') {
            try {
                await NavigationBar.setBackgroundColorAsync(theme === 'dark' ? '#121212' : '#FAFAFA');
                await NavigationBar.setButtonStyleAsync(theme === 'dark' ? 'light' : 'dark');
            } catch (error) {
                console.error("Error setting navigation bar color:", error);
            }
        }
    }, []);
    
    useEffect(() => {
        const updateSystemTheme = () => {
            const colorScheme = Appearance.getColorScheme();
            setSystemTheme(colorScheme === 'dark' ? 'dark' : 'light');
            if(isDarkMode === undefined){
                setNavigationBarColor(colorScheme || 'light');
            }
        };

        const listener = Appearance.addChangeListener(updateSystemTheme);
        return () => listener.remove();
    }, []);

    useEffect(() => {
        setCurrentTheme(getCurrentTheme());
        setNavigationBarColor(getCurrentTheme());
    }, [isDarkMode, getCurrentTheme, setNavigationBarColor]); // Only `isDarkMode` is a dependency now

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