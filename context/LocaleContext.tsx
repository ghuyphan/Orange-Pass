import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { i18n, changeLocale } from '@/i18n';
import { storage } from '@/utils/storage';
import { useMMKVString } from 'react-native-mmkv';

interface LocaleContextProps {
  locale: string | undefined;
  updateLocale: (newLocale: string | undefined) => void;
}

const LocaleContext = createContext<LocaleContextProps | undefined>(undefined);

interface LocaleProviderProps {
  children: ReactNode;
}

export const LocaleProvider: React.FC<LocaleProviderProps> = ({ children }) => {
  const [locale, setLocale] = useMMKVString('locale' );

  // Memoized update locale function
  const updateLocale = useCallback((newLocale: string | undefined) => {
    // Persist the locale in storage
    if (newLocale) {
      // storage.set('app_locale', newLocale);
      setLocale(newLocale);
    } else {
      setLocale(undefined);
    }
  }, []);

  // Update i18n when locale changes
  useEffect(() => {
    if (locale === undefined) {
      // Reset to default or system locale
      changeLocale(undefined);
    } else {
      // Change to the specific locale
      changeLocale(locale);
    }
  }, [locale]);

  // Memoize context value to optimize performance
  const contextValue = useMemo(() => ({
    locale,
    updateLocale
  }), [locale, updateLocale]);

  return (
    <LocaleContext.Provider value={contextValue}>
      {children}
    </LocaleContext.Provider>
  );
};

// Custom hook to use locale context
export const useLocale = (): LocaleContextProps => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
};

export default LocaleProvider;