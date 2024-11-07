import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { i18n, changeLocale } from '@/i18n';
import { storage } from '@/utils/storage';

interface LocaleContextProps {
    locale: string;
    updateLocale: (newLocale: string) => void;
}

const LocaleContext = createContext<LocaleContextProps | undefined>(undefined);

interface LocaleProviderProps {
    children: ReactNode;
}

export const LocaleProvider: React.FC<LocaleProviderProps> = ({ children }) => {
    // Initialize locale from MMKV only once when provider mounts
    const initialLocale = storage.getString('locale') || i18n.locale;
    const [locale, setLocale] = useState(initialLocale);

    const updateLocale = useCallback((newLocale: string) => {
        if (newLocale !== locale) { // Only update if different
            setLocale(newLocale); // Update local state
            storage.set('locale', newLocale); // Save to MMKV
        }
    }, [locale]);

    useEffect(() => {
        changeLocale(locale); // Update i18n only when locale changes
    }, [locale]);

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
