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

/** 
 * Cập nhật `locale` từ `MMKV` hoặc lấy từ hệ thống nếu không có trong `MMKV`
 */
const initializeLocale = () => {
    const storedLocale = storage.getString("locale");
    if (storedLocale) {
        i18n.locale = storedLocale;
    } else {
        // Dùng ngôn ngữ hệ thống mặc định
        const systemLocale = getLocales()[0].languageCode ?? 'en';
        i18n.locale = Platform.OS !== 'web' ? systemLocale : 'en';
    }
};

// Khởi tạo `locale`
initializeLocale();

/** Hàm dịch */
export const t = (key: string) => i18n.t(key);

/** Hàm để thay đổi `locale` thủ công */
export const changeLocale = (newLocale?: string) => {
    if (newLocale) {
        i18n.locale = newLocale;
        storage.set('locale', newLocale); // Lưu vào `MMKV` khi chọn ngôn ngữ
    } else {
        // Khi chọn ngôn ngữ hệ thống, xóa `locale` khỏi `MMKV`
        storage.delete('locale');
        i18n.locale = getLocales()[0].languageCode ?? 'en'; // Lấy lại ngôn ngữ hệ thống
    }
};

export { i18n };
