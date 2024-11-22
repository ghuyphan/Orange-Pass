import enDatas from '@/assets/enDatas.json';
import viDatas from '@/assets/viDatas.json';
import colorConfig from '@/assets/color-config.json';

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
    number_code?: string; 
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
function initializeData(locale: string | null = null) {
    if (locale !== cachedLanguageCode) {
        cachedLanguageCode = locale;
        const data: { [key: string]: any[] } = locale === 'en' ? enDatas : viDatas;

        cachedDataByCode = {};
        searchIndex = {};
        const types = ['bank', 'store']; 

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
                        number_code: item.number_code, 
                        color: colorData.color,
                        accent_color: colorData.accent_color,
                    };

                    itemsByCode[code] = processedItem;

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

// Function to return item data, including number_code
export function returnItemData(code: string, type: 'bank' | 'store' | 'ewallet', locale: string | null = null) {
    if (!cachedDataByCode[type] || locale !== cachedLanguageCode) {
        initializeData(locale);
    }

    const item = cachedDataByCode[type][code];

    if (item) {
        return {
            name: item.name,
            full_name: item.full_name,
            number_code: item.number_code || '', 
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
export function returnItemCode(searchTerm: string, type?: 'bank' | 'store' | 'ewallet', locale: string | null = null): string[] {
    if (!searchIndex || locale !== cachedLanguageCode) {
        initializeData(locale);
    }

    const types = type ? [type] : ['bank', 'store']; 
    const normalizedSearchTerm = normalizeText(searchTerm);
    const matchingCodesSet = new Set<string>();

    types.forEach((t) => {
        const typeSearchIndex = searchIndex[t];
        if (typeSearchIndex[normalizedSearchTerm]) {
            typeSearchIndex[normalizedSearchTerm].forEach((code) => matchingCodesSet.add(code));
        } else {
            for (const term in typeSearchIndex) {
                if (term.includes(normalizedSearchTerm)) {
                    typeSearchIndex[term].forEach((code) => matchingCodesSet.add(code));
                }
            }
        }
    });

    return Array.from(matchingCodesSet);
}