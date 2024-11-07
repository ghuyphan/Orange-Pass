import enDatas from '@/assets/enDatas.json';
import viDatas from '@/assets/viDatas.json';
import colorConfig from '@/assets/color-config.json';
import { getLocales } from 'expo-localization';

// Define types
type ColorConfigType = {
    [key: string]: {
        color: { light: string; dark: string };
        accent_color: { light: string; dark: string };
    };
};

type ItemType = {
    code: string;
    name: string;
    full_name: string;
    normalized_name: string;
    normalized_full_name: string;
    number_code?: string; // Add number_code as an optional field
    color: { light: string; dark: string };
    accent_color: { light: string; dark: string };
};

// Cast colorConfig to the defined type
const colorConfigTyped = colorConfig as ColorConfigType;

// Helper function to normalize text
function normalizeText(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

// Caches
let cachedLanguageCode: string | null = null;
let cachedDataByCode: { [type: string]: { [code: string]: ItemType } } = {};
let searchIndex: { [type: string]: { [normalizedTerm: string]: Set<string> } } = {};

// Initialize data and build indices
function initializeData() {
    const languageCode = getLocales()[0]?.languageCode || 'en';
    console.log('Language code:', languageCode);

    if (languageCode !== cachedLanguageCode) {
        cachedLanguageCode = languageCode;
        const data = languageCode === 'en' ? enDatas : viDatas;

        cachedDataByCode = {};
        searchIndex = {};
        const types = ['bank', 'store']; // Add 'ewallet' if needed

        types.forEach((type) => {
            if (data[type]) {
                const itemsArray = data[type];
                const itemsByCode: { [code: string]: ItemType } = {};
                const typeSearchIndex: { [normalizedTerm: string]: Set<string> } = {};

                itemsArray.forEach((item: any) => {
                    const code = item.code as string;
                    const normalized_name = normalizeText(item.name);
                    const normalized_full_name = normalizeText(item.full_name);

                    const colorData = colorConfigTyped[code] || { color: { light: '', dark: '' }, accent_color: { light: '', dark: '' } };
                    const processedItem: ItemType = {
                        ...item,
                        normalized_name,
                        normalized_full_name,
                        number_code: item.number_code, // Include number_code if available
                        color: colorData.color,
                        accent_color: colorData.accent_color,
                    };

                    // Store item by code for O(1) access
                    itemsByCode[code] = processedItem;

                    // Build search index
                    const terms = new Set<string>([normalized_name, normalized_full_name]);
                    terms.forEach((term) => {
                        if (!typeSearchIndex[term]) {
                            typeSearchIndex[term] = new Set();
                        }
                        typeSearchIndex[term].add(code);
                    });
                });

                cachedDataByCode[type] = itemsByCode;
                searchIndex[type] = typeSearchIndex;
            } else {
                cachedDataByCode[type] = {};
                searchIndex[type] = {};
            }
        });
    }
}

// Initialize data once
initializeData();

// Function to return item data, including number_code
export function returnItemData(code: string, type: 'bank' | 'store' | 'ewallet') {
    if (!cachedDataByCode[type]) {
        initializeData();
    }

    const item = cachedDataByCode[type][code];

    if (item) {
        return {
            name: item.name,
            full_name: item.full_name,
            number_code: item.number_code || '', // Return number_code if available
            color: item.color,
            accent_color: item.accent_color,
        };
    } else {
        return {
            name: '',
            full_name: '',
            number_code: '',
            color: { light: '', dark: '' },
            accent_color: { light: '', dark: '' },
        };
    }
}

// Function to return matching codes for a search term
export function returnItemCode(searchTerm: string, type?: 'bank' | 'store' | 'ewallet'): string[] {
    if (!searchIndex) {
        initializeData();
    }

    const types = type ? [type] : ['bank', 'store']; // Add 'ewallet' if needed
    const normalizedSearchTerm = normalizeText(searchTerm);
    const matchingCodesSet = new Set<string>();

    types.forEach((t) => {
        const typeSearchIndex = searchIndex[t];
        if (typeSearchIndex[normalizedSearchTerm]) {
            typeSearchIndex[normalizedSearchTerm].forEach((code) => matchingCodesSet.add(code));
        } else {
            // Partial matching (if full term not found)
            for (const term in typeSearchIndex) {
                if (term.includes(normalizedSearchTerm)) {
                    typeSearchIndex[term].forEach((code) => matchingCodesSet.add(code));
                }
            }
        }
    });

    return Array.from(matchingCodesSet);
}
