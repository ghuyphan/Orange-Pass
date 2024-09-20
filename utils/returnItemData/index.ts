import enDatas from '@/assets/enDatas.json';
import viDatas from '@/assets/viDatas.json';
import { getLocales } from 'expo-localization';

export function returnItemData(code: string, type: 'bank' | 'store' | 'ewallet') {
    const locales = getLocales();
    const languageCode = locales[0]?.languageCode;
    const data = languageCode === 'en' ? enDatas : viDatas;
    const dataType = data[type];
    const item = dataType.find((item: { code: string }) => item.code === code);

    if (item) {
        return {
            name: item.name,
            full_name: item.full_name,
            color: {
                light: item.color.light,
                dark: item.color.dark,
            },
            accent_color: {
                light: item.accent_color.light,
                dark: item.accent_color.dark,
            },
        };
    } else {
        return {
            name: '',
            full_name: '',
            color: {
                light: '',
                dark: '',
            },
            accent_color: {
                light: '',
                dark: '',
            },
        };
    }
}

// Helper function to normalize and remove accents/diacritics from text
function normalizeText(text: string): string {
    return text
        .normalize('NFD') // Normalize to decomposed form
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
        .toLowerCase(); // Convert to lowercase
}

export function returnItemCode(searchTerm: string, type: 'bank' | 'store' | 'ewallet'): string[] {
    const locales = getLocales();
    const languageCode = locales[0]?.languageCode;
    const data = languageCode === 'en' ? enDatas : viDatas;
    const dataType = data[type];
    
    // Normalize search term for case-insensitive and accent-insensitive matching
    const normalizedSearchTerm = normalizeText(searchTerm);

    // Find all items where the name or full_name includes the normalized search term
    const matchingItems = dataType.filter((item: { code: string; name: string; full_name: string }) => 
        normalizeText(item.name).includes(normalizedSearchTerm) ||
        normalizeText(item.full_name).includes(normalizedSearchTerm)
    );

    // Return an array of matching codes
    return matchingItems.map((item: { code: string; name: string; full_name: string }) => item.code.toLowerCase());
}