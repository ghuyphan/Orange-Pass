import enDatas from '@/assets/enDatas.json';
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
const normalizeText = (text: string): string => text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

// Create a map to store data by code and type
const dataByCode: { [type: string]: { [code: string]: ItemType } } = {};

// Create a map to store search indices by type
const searchIndex: { [type: string]: Map<string, Set<string>> } = {};

// Initialize data and build indices
const initializeData = () => {
    for (const type of ['bank', 'store']) {
        const items = enDatas[type];
        if (!items) continue;

        dataByCode[type] = {};
        searchIndex[type] = new Map();

        for (const item of items) {
            const { code, name, full_name } = item;
            const normalizedName = normalizeText(name);
            const normalizedFullName = normalizeText(full_name);

            const colorData = colorConfigTyped[code] || { color: { light: '', dark: '' }, accent_color: { light: '', dark: '' } };
            dataByCode[type][code] = {
                ...item,
                normalized_name: normalizedName,
                normalized_full_name: normalizedFullName,
                color: colorData.color,
                accent_color: colorData.accent_color,
            };

            // Use a Map for efficient search indexing
            const addTermToIndex = (term: string) => {
                const codes = searchIndex[type].get(term) || new Set();
                codes.add(code);
                searchIndex[type].set(term, codes);
            }
            addTermToIndex(normalizedName);
            addTermToIndex(normalizedFullName);
        }
    }
};

// Initialize the data on load
initializeData();

// Function to return item data, including number_code
export const returnItemData = (code: string, type: 'bank' | 'store' | 'ewallet'): ItemType => {
    const item = dataByCode[type]?.[code];
    return item || {
        name: '',
        full_name: '',
        number_code: '',
        color: { light: '', dark: '' },
        accent_color: { light: '', dark: '' },
    };
};

// Function to return matching codes for a search term
export const returnItemCode = (searchTerm: string, type?: 'bank' | 'store' | 'ewallet'): string[] => {
    const normalizedSearchTerm = normalizeText(searchTerm);
    const matchingCodes = new Set<string>();

    for (const t of type ? [type] : ['bank', 'store']) {
        const typeSearchIndex = searchIndex[t];
        if (!typeSearchIndex) continue;

        // Directly check if the term exists in the index Map
        if (typeSearchIndex.has(normalizedSearchTerm)) {
            typeSearchIndex.get(normalizedSearchTerm)?.forEach(code => matchingCodes.add(code));
        } else {
            // Iterate over the Map keys for partial matches
            for (const term of typeSearchIndex.keys()) {
                if (term.includes(normalizedSearchTerm)) {
                    typeSearchIndex.get(term)?.forEach(code => matchingCodes.add(code));
                }
            }
        }
    }

    return Array.from(matchingCodes);
};