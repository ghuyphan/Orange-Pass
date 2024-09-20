import { Platform } from "react-native";
import { getLocales } from "expo-localization";
import { I18n } from "i18n-js";

import en from './locales/en.json'
import vi from './locales/vi.json'

const i18n = new I18n({
    en,
    vi,
});

if (Platform.OS !== 'web') {
    i18n.locale = getLocales()[0].languageCode??'en';
} else {
    i18n.locale = 'en';
}

i18n.enableFallback = true;

/** i18n for translation */
export const t = (key: string) => i18n.t(key);



