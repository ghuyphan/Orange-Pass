import { Platform, AppState } from "react-native";
import { getLocales } from "expo-localization";
import { I18n } from "i18n-js";
import { storage } from "./utils/storage";

import en from './locales/en.json';
import vi from './locales/vi.json';

const i18n = new I18n({
    en,
    vi,
});

i18n.enableFallback = true;

// Function to set locale based on stored value or system default
const updateLocale = () => {
    const storedLocale = storage.getString("locale");
    if (storedLocale) {
        i18n.locale = storedLocale;
    } else {
        const systemLocale = getLocales()[0].languageCode ?? 'en';
        i18n.locale = Platform.OS !== 'web' ? systemLocale : 'en';
        if (Platform.OS === 'web') storage.set('locale', 'en');
    }
};

// Initial setup for locale
updateLocale();

/** i18n for translation */
export const t = (key: string) => i18n.t(key);

/** Function to change locale manually */
export const changeLocale = (newLocale: string) => {
    i18n.locale = newLocale;
    storage.set('locale', newLocale);
};

// Listen for app state changes to re-check locale
AppState.addEventListener("change", (nextAppState) => {
    if (nextAppState === "active") {
        const systemLocale = getLocales()[0].languageCode ?? 'en';
        if (!storage.getString("locale") && i18n.locale !== systemLocale) {
            i18n.locale = systemLocale;
        }
    }
});
