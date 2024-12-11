import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { i18n, changeLocale } from '@/i18n';
import { MMKV } from 'react-native-mmkv'; // Assuming you're using MMKV for storage

// Create a storage instance
const storage = new MMKV();

interface LocaleContextProps {
  locale: string | undefined;
  updateLocale: (newLocale: string | undefined) => void;
}

const LocaleContext = createContext<LocaleContextProps | undefined>(undefined);

interface LocaleProviderProps {
  children: ReactNode;
}

export const LocaleProvider: React.FC<LocaleProviderProps> = ({ children }) => {
  // Retrieve initial locale from persistent storage
  const [locale, setLocale] = useState<string | undefined>(() => {
    // Try to get the stored locale, fallback to i18n.locale if not found
    const storedLocale = storage.getString('app_locale');
    return storedLocale || i18n.locale;
  });

  // Memoized update locale function
  const updateLocale = useCallback((newLocale: string | undefined) => {
    // Update locale in state
    setLocale(newLocale);

    // Persist the locale in storage
    if (newLocale) {
      storage.set('app_locale', newLocale);
    } else {
      // Remove the stored locale if undefined
      storage.delete('app_locale');
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