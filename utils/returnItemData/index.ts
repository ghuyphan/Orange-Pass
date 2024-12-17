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
  full_name: Record<string, string>;
  normalized_name: string;
  normalized_full_name: string;
  bin?: string; // Bin is optional since it's only for bank items
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
    const normalizedFullName = normalizeText(full_name); // Normalize once

    const colorData = (colorConfig as Record<string, ColorInfo>)[code] || {
      color: { light: '' },
      accent_color: { light: '' }
    };

    const darkColor = getDarkModeColor(colorData.color.light); // Calculate dark color once
    const darkAccentColor = getDarkModeColor(colorData.accent_color.light); // Calculate dark accent color once

    dataByCode[type][code] = {
      ...item,
      full_name: item.full_name,
      normalized_name: normalizeText(name),
      normalized_full_name: normalizedFullName, // Reuse normalized value
      color: {
        light: colorData.color.light,
        dark: darkColor 
      },
      accent_color: {
        light: colorData.accent_color.light,
        dark: darkAccentColor 
      }
    };

    for (const localeKey in item.full_name) {
      const normalizedLocaleName = normalizeText(item.full_name[localeKey]);
      addSearchTerms(type, code, searchIndex, normalizedLocaleName);
    }
  }
};

const processVietQRBanksItems = (
  locale: string,
  searchIndex: Record<DataType, Map<string, Set<string>>>,
  dataByCode: Record<DataType, Record<string, ItemType>>
): void => {
  const items = Datas['vietqr'];
  if (!items) return;

  const defaultDarkColor = getDarkModeColor('#1E90FF'); // Calculate once
  const defaultColor = { light: '#1E90FF', dark: defaultDarkColor };

  for (const item of items) {
    const { code, name } = item;
    const full_name = item.full_name[locale];
    const normalizedName = normalizeText(name);
    const normalizedFullName = normalizeText(full_name); 

    dataByCode['vietqr'][code] = {
      ...item,
      full_name: item.full_name,
      normalized_name: normalizedName,
      normalized_full_name: normalizedFullName,
      color: defaultColor,
      accent_color: {
        light: defaultColor.light,
        dark: defaultDarkColor // Reuse value
      }
    };

    for (const localeKey in item.full_name) {
      const normalizedLocaleName = normalizeText(item.full_name[localeKey]);
      addSearchTerms('vietqr', code, searchIndex, normalizedLocaleName);
    }
  }
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

  initializeData();

  const getItemData = (code: string, type?: DataType): ItemType => {
    const itemData = (type && dataByCode[type]?.[code]) || { // Check if type is provided and exists
      code: '',
      name: '',
      full_name: { en: '', vi: '', ru: '' },
      normalized_name: '',
      normalized_full_name: '',
      bin: '', // Default empty string for bin
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

  const getItemCodeByBin = (bin: string): string | null => {
    const items = getItemsByType('bank'); // Only search bank items
    const foundItem = items.find(item => item.bin === bin);
    return foundItem ? foundItem.code : null;
  };

  return {
    getItemData,
    getItemsByType,
    searchItems,
    getItemCodeByBin
  };
};


const dataManager = createDataManager('vi');

export const returnItemData = (code: string, type?: DataType) =>
  dataManager.getItemData(code, type);

export const returnItemsByType = (type: DataType) =>
  dataManager.getItemsByType(type);

export const returnItemCode = (searchTerm: string, type?: DataType) =>
  dataManager.searchItems(searchTerm, type ? [type] : undefined);

export const returnItemCodeByBin = (bin: string) =>
  dataManager.getItemCodeByBin(bin);