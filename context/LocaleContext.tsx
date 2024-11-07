import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { i18n, changeLocale } from '@/i18n';
import { storage } from '@/utils/storage';

interface LocaleContextProps {
    locale: string | undefined;
    updateLocale: (newLocale?: string) => void;
}

const LocaleContext = createContext<LocaleContextProps | undefined>(undefined);

interface LocaleProviderProps {
    children: ReactNode;
}

export const LocaleProvider: React.FC<LocaleProviderProps> = ({ children }) => {
    // Lấy `locale` từ MMKV khi ứng dụng khởi động, nếu không có thì mặc định theo hệ thống
    const initialLocale = storage.getString('locale') || i18n.locale;
    const [locale, setLocale] = useState<string | undefined>(initialLocale);

    const updateLocale = useCallback((newLocale?: string) => {
        if (newLocale) {
            setLocale(newLocale);
            storage.set('locale', newLocale); // Lưu vào MMKV nếu có `newLocale`
        } else {
            setLocale(undefined); // Xóa `locale` trong state
            storage.delete('locale'); // Xóa khỏi MMKV để dùng ngôn ngữ hệ thống
        }
    }, []);

    useEffect(() => {
        // Nếu `locale` là undefined, dùng ngôn ngữ hệ thống
        const effectiveLocale = locale || i18n.locale;
        changeLocale(effectiveLocale);
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
