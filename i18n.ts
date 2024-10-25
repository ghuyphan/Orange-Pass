import { Platform } from "react-native";
import { getLocales } from "expo-localization";
import { I18n } from "i18n-js";
import { storage } from "./utils/storage";

import en from './locales/en.json';
import vi from './locales/vi.json';

const i18n = new I18n({
    en,
    vi,
});

// Retrieve the stored locale from MMKV
const storedLocale = storage.getString("locale");

if (storedLocale) {
    i18n.locale = storedLocale;
} else {
    if (Platform.OS !== 'web') {
        i18n.locale = getLocales()[0].languageCode ?? 'en';
    } else {
        i18n.locale = 'en';
        storage.set('locale', 'en');
    }
}

i18n.enableFallback = true;

/** i18n for translation */
export const t = (key: string) => i18n.t(key);