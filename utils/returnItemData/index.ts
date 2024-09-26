import enDatas from '@/assets/enDatas.json';
import viDatas from '@/assets/viDatas.json';
import { getLocales } from 'expo-localization';

// Helper function to normalize and remove accents/diacritics from text
function normalizeText(text: string): string {
    return text.normalize('NFD') // Normalize to decomposed form
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
        .toLowerCase(); // Convert to lowercase
}

// Cache for language code and data
let cachedLanguageCode: string | null = null;
let cachedData: any = null;
let cachedDataTypes: any = null;

// Preprocess data and normalize item names
function initializeData() {
    const languageCode = getLocales()[0]?.languageCode || 'en';
    if (languageCode !== cachedLanguageCode) {
        cachedLanguageCode = languageCode;
        const data = languageCode === 'en' ? enDatas : viDatas;

        // Preprocess and normalize item names and full names
        cachedData = data;
        cachedDataTypes = {
            bank: data.bank
                ? data.bank.map((item: any) => ({
                      ...item,
                      normalized_name: normalizeText(item.name),
                      normalized_full_name: normalizeText(item.full_name),
                  }))
                : [],
            store: data.store
                ? data.store.map((item: any) => ({
                      ...item,
                      normalized_name: normalizeText(item.name),
                      normalized_full_name: normalizeText(item.full_name),
                  }))
                : [],
            // ewallet: data.ewallet
            //     ? data.ewallet.map((item: any) => ({
            //           ...item,
            //           normalized_name: normalizeText(item.name),
            //           normalized_full_name: normalizeText(item.full_name),
            //       }))
            //     : [],
        };
    }
}


// Initialize data once
initializeData();

export function returnItemData(code: string, type: 'bank' | 'store' | 'ewallet') {
    // Use cached data
    if (!cachedData) {
        initializeData();
    }
    const dataType = cachedData[type];

    const item = dataType.find((item: { code: string }) => item.code === code);

    if (item) {
        return {
            name: item.name,
            full_name: item.full_name,
            color: item.color,
            accent_color: item.accent_color,
        };
    } else {
        return {
            name: '',
            full_name: '',
            color: { light: '', dark: '' },
            accent_color: { light: '', dark: '' },
        };
    }
}

export function returnItemCode(searchTerm: string, type?: 'bank' | 'store' | 'ewallet'): string[] {
    // Ensure data is initialized
    if (!cachedDataTypes) {
        initializeData();
    }

    // Build dataTypes array, excluding undefined or empty arrays
    let dataTypes: Array<any> = [];

    if (type) {
        if (cachedDataTypes[type] && cachedDataTypes[type].length > 0) {
            dataTypes.push(cachedDataTypes[type]);
        }
    } else {
        ['bank', 'store', 'ewallet'].forEach((key) => {
            if (cachedDataTypes[key] && cachedDataTypes[key].length > 0) {
                dataTypes.push(cachedDataTypes[key]);
            }
        });
    }

    // Normalize search term for case-insensitive and accent-insensitive matching
    const normalizedSearchTerm = normalizeText(searchTerm);

    const matchingCodesSet = new Set<string>();

    dataTypes.forEach((dataType) => {
        dataType.forEach((item: { code: string; normalized_name: string; normalized_full_name: string }) => {
            if (
                item.normalized_name.includes(normalizedSearchTerm) ||
                item.normalized_full_name.includes(normalizedSearchTerm)
            ) {
                matchingCodesSet.add(item.code.toLowerCase());
            }
        });
    });

    // Return an array of unique matching codes
    return Array.from(matchingCodesSet);
}
