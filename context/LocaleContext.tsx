import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { i18n, changeLocale } from '@/i18n';

interface LocaleContextProps {
    locale: string | undefined;
    updateLocale: (newLocale: string | undefined) => void;
}

const LocaleContext = createContext<LocaleContextProps | undefined>(undefined);

interface LocaleProviderProps {
    children: ReactNode;
}

export const LocaleProvider: React.FC<LocaleProviderProps> = ({ children }) => {
    const [locale, setLocale] = useState<string | undefined>(i18n.locale);

    // useCallback to ensure updateLocale is memoized and stable
    const updateLocale = useCallback((newLocale: string | undefined) => {
        setLocale(newLocale); // Update locale in context
    }, []);

    // Update i18n when locale changes
    useEffect(() => {
        if (locale === undefined) {
            // Update MMKV variable to a default or null value
            changeLocale(undefined); // or some other default value
        } else {
            changeLocale(locale);
        }
    }, [locale]);

    // Memoize context value to avoid unnecessary re-renders
    const contextValue = useMemo(() => ({ locale, updateLocale }), [locale, updateLocale]);

    return (
        <LocaleContext.Provider value={contextValue}>
            {children}
        </LocaleContext.Provider>
    );
};

export const useLocale = (): LocaleContextProps => {
    const context = useContext(LocaleContext);
    if (!context) {
        throw new Error("useLocale must be used within a LocaleProvider");
    }
    return context;
};