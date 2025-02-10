import tinycolor from 'tinycolor2';
import Datas from '@/assets/Datas.json';
import colorConfig from '@/assets/color-config.json';
import vietQRBanksData from '@/assets/vietQRBanks.json'; // Import the JSON data
import DataType from '@/types/dataType';

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
  bin?: string;
  color: { light: string; dark: string };
  accent_color: { light: string; dark: string };
}

// *** ADDED:  Interface for the return type of getItemData ***
interface ItemDataWithType extends ItemType {
  type: DataType;
}

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
    const dataTypes: DataType[] = ['bank', 'store', 'ewallet']; // No need to process 'vietqr' here
    for (const type of dataTypes) {
      processDataItems(type, locale, searchIndex, dataByCode);
    }
    // Removed processVietQRBanksItems call

    // Add VietQR banks data directly
    vietQRBanksData.banks.forEach(bank => {
      const defaultColor = { light: '#1E90FF', dark: getDarkModeColor('#1E90FF') };
      dataByCode['vietqr'][bank.code] = {
        ...bank,
        full_name: {
          en: bank.full_name, // Assuming you want to use the full_name from the JSON
          vi: bank.full_name,
          ru: bank.full_name
        },
        normalized_name: normalizeText(bank.name),
        normalized_full_name: normalizeText(bank.full_name),
        color: defaultColor,
        accent_color: {
          light: defaultColor.light,
          dark: defaultColor.dark
        }
      };

      // Add search terms for VietQR banks
      addSearchTerms('vietqr', bank.code, searchIndex, normalizeText(bank.full_name), normalizeText(bank.name));
    });
  };



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
      const normalizedFullName = normalizeText(full_name);

      const colorData = (colorConfig as Record<string, ColorInfo>)[code] || {
        color: { light: '' },
        accent_color: { light: '' }
      };

      const darkColor = getDarkModeColor(colorData.color.light);
      const darkAccentColor = getDarkModeColor(colorData.accent_color.light);

      dataByCode[type][code] = {
        ...item,
        full_name: item.full_name,
        normalized_name: normalizeText(name),
        normalized_full_name: normalizedFullName,
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


  initializeData();

  const getItemData = (code: string, type?: DataType): ItemDataWithType => {
    const typesToSearch: DataType[] = type ? [type] : ['bank', 'store', 'ewallet', 'vietqr'];

    for (const currentType of typesToSearch) {
        if (dataByCode[currentType]?.[code]) {
            const itemData = dataByCode[currentType]?.[code];
            return {
                ...itemData,
                full_name: itemData.full_name,
                type: currentType // *** ADDED: Return the type ***
            };
        }
    }

    // Default return if no item is found,  include 'type'
    return {
        code: '',
        name: '',
        full_name: { en: '', vi: '', ru: '' },
        normalized_name: '',
        normalized_full_name: '',
        bin: '',
        color: { light: '', dark: '' },
        accent_color: { light: '', dark: '' },
        type: 'bank' // Or some other default, or even throw an error/log a warning.
    };
};

  const getItemsByType = (type: DataType): ItemType[] => {
    // For 'vietqr', directly return the data from vietQRBanksData
    if (type === 'vietqr') {
      return vietQRBanksData.banks.map(bank => ({
        ...bank,
        full_name: {
          en: bank.full_name,
          vi: bank.full_name,
          ru: bank.full_name
        },
        normalized_name: normalizeText(bank.name),
        normalized_full_name: normalizeText(bank.full_name),
        color: { light: '#1E90FF', dark: getDarkModeColor('#1E90FF') },
        accent_color: { light: '#1E90FF', dark: getDarkModeColor('#1E90FF') }
      }));
    }
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
    const items = getItemsByType('bank');
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

export const returnItemData = (code: string, type?: DataType): ItemDataWithType =>  // Updated return type
  dataManager.getItemData(code, type);

export const returnItemsByType = (type: DataType) =>
  dataManager.getItemsByType(type);

export const returnItemCode = (searchTerm: string, type?: DataType) =>
  dataManager.searchItems(searchTerm, type ? [type] : undefined);

export const returnItemCodeByBin = (bin: string) =>
  dataManager.getItemCodeByBin(bin);