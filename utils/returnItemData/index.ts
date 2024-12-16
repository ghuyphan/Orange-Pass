import tinycolor from 'tinycolor2';
import Datas from '@/assets/Datas.json';
import colorConfig from '@/assets/color-config.json';

interface ColorInfo {
  color: { light: string };
  accent_color: { light: string };
}

interface ItemType {
  code: string;
  name: string;
  full_name: Record<string, string>; // Updated to hold localized names
  normalized_name: string;
  normalized_full_name: string;
  bin?: string;
  color: { light: string; dark: string };
  accent_color: { light: string; dark: string };
}

type DataType = 'bank' | 'store' | 'ewallet' | 'vietqr';

const normalizeTextCache = new Map<string, string>();

function normalizeText(text: string): string {
  if (normalizeTextCache.has(text)) {
    return normalizeTextCache.get(text)!;
  }
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  normalizeTextCache.set(text, normalized);
  return normalized;
}

function getDarkModeColor(lightColor: string): string {
  const color = tinycolor(lightColor);
  let { h, s, l } = color.toHsl();

  l = Math.max(0.18, Math.min(0.48, l * 0.58));
  s = Math.min(1, s * 1.05);
  h = (h + 3) % 360;

  return tinycolor({ h, s, l }).toHexString();
}

const processDataItems = (
  type: DataType,
  locale: string,
  searchIndex: Record<DataType, Map<string, Set<string>>>,
  dataByCode: Record<DataType, Record<string, ItemType>>
): void => {
  const items = Datas[type];
  if (!items) return;

  for (const item of items) {
    const { code, name } = item;
    const full_name = item.full_name[locale];

    const colorData = (colorConfig as Record<string, ColorInfo>)[code] || {
      color: { light: '' },
      accent_color: { light: '' }
    };

    dataByCode[type][code] = {
      ...item,
      full_name: item.full_name, // Store the full_name object 
      normalized_name: normalizeText(name),
      normalized_full_name: normalizeText(full_name),
      color: {
        light: colorData.color.light,
        dark: getDarkModeColor(colorData.color.light)
      },
      accent_color: {
        light: colorData.accent_color.light,
        dark: getDarkModeColor(colorData.accent_color.light)
      }
    };

    // Add search terms for all locales
    for (const localeKey in item.full_name) {
      addSearchTerms(type, code, searchIndex, normalizeText(item.full_name[localeKey]));
    }
  }
};

const vietqrBankCodes = ['ACB', 'VBA', 'ABB', 'BVB', 'BIDV', 'CAKE', 'CIMB', 'COOPBANK', 'EIB', 'HDB', 'KLB', 'MB', 'NAB', 'NCB', 'OCB', 'Oceanbank', 'PBVN', 'PVCB', 'SHB', 'SGICB', 'TCB', 'TPB', 'VIB', 'VIETBANK', 'VCB', 'VAB', 'ICB', 'VPB', 'WVN']; 

const processVietQRBanksItems = (
  locale: string,
  searchIndex: Record<DataType, Map<string, Set<string>>>,
  dataByCode: Record<DataType, Record<string, ItemType>>
): void => {
  const defaultColor = { light: '#1E90FF', dark: getDarkModeColor('#1E90FF') };

  vietqrBankCodes.forEach(code => {
    const bankData = dataByCode['bank'][code];
    if (bankData) {
      const full_name = bankData.full_name[locale];
      const normalizedName = normalizeText(bankData.name);
      const normalizedFullName = normalizeText(full_name);

      dataByCode['vietqr'][code] = {
        ...bankData, 
        full_name: bankData.full_name,
        normalized_name: normalizedName,
        normalized_full_name: normalizedFullName,
        color: defaultColor,
        accent_color: {
          light: defaultColor.light,
          dark: getDarkModeColor(defaultColor.light)
        }
      };

      // Add search terms (using bankData.full_name)
      for (const localeKey in bankData.full_name) {
        addSearchTerms('vietqr', code, searchIndex, normalizeText(bankData.full_name[localeKey]));
      }
    }
  });
};

const addSearchTerms = (
  type: DataType,
  code: string,
  searchIndex: Record<DataType, Map<string, Set<string>>>,
  ...terms: string[]
): void => {
  for (const term of terms) {
    const typeIndex = searchIndex[type];
    const existingCodes = typeIndex.get(term) || new Set<string>();
    existingCodes.add(code);
    typeIndex.set(term, existingCodes);
  }
};

const createDataManager = (locale: string = 'en') => {
  const dataByCode: Record<DataType, Record<string, ItemType>> = {
    bank: {},
    store: {},
    ewallet: {},
    vietqr: {}
  };
  const searchIndex: Record<DataType, Map<string, Set<string>>> = {
    bank: new Map(),
    store: new Map(),
    ewallet: new Map(),
    vietqr: new Map()
  };

  const initializeData = (): void => {
    const dataTypes: DataType[] = ['bank', 'store', 'ewallet', 'vietqr'];
    for (const type of dataTypes) {
      processDataItems(type, locale, searchIndex, dataByCode);
    }
    processVietQRBanksItems(locale, searchIndex, dataByCode);
  };

  initializeData(); // Initialize the data immediately

  const getItemData = (code: string, type: DataType): ItemType => {
    const itemData = dataByCode[type]?.[code] || {
      code: '',
      name: '',
      full_name: { en: '', vi: '', ru: '' }, // Default for full_name
      normalized_name: '',
      normalized_full_name: '',
      bin: '',
      color: { light: '', dark: '' },
      accent_color: { light: '', dark: '' }
    };
    return {
      ...itemData,
      full_name: itemData.full_name
    };
  };

  const getItemsByType = (type: DataType): ItemType[] => {
    return Object.values(dataByCode[type]);
  };

  const searchItems = (searchTerm: string, types?: DataType[]): string[] => {
    const normalizedSearchTerm = normalizeText(searchTerm);
    const matchingCodes = new Set<string>();
    const searchTypes = types || ['bank', 'store', 'ewallet', 'vietqr'];

    for (const type of searchTypes) {
      const typeSearchIndex = searchIndex[type];
      if (!typeSearchIndex) continue;

      const exactMatch = typeSearchIndex.get(normalizedSearchTerm);
      if (exactMatch) {
        exactMatch.forEach(code => matchingCodes.add(code));
      }

      for (const [term, codes] of typeSearchIndex.entries()) {
        if (normalizedSearchTerm.length > 1 && term.includes(normalizedSearchTerm)) {
          codes.forEach(code => matchingCodes.add(code));
        }
      }
    }

    return Array.from(matchingCodes);
  };

  return {
    getItemData,
    getItemsByType,
    searchItems
  };
};

// Create a data manager instance with the desired locale
const dataManager = createDataManager('vi'); // For Vietnamese

export const returnItemData = (code: string, type: DataType) =>
  dataManager.getItemData(code, type);

export const returnItemsByType = (type: DataType) =>
  dataManager.getItemsByType(type);

export const returnItemCode = (searchTerm: string, type?: DataType) =>
  dataManager.searchItems(searchTerm, type ? [type] : undefined);