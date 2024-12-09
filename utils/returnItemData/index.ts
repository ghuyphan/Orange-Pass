import enDatas from '@/assets/enDatas.json';
import colorConfig from '@/assets/color-config.json';
import tinycolor from 'tinycolor2'; 

interface ColorInfo {
  color: { light: string };
  accent_color: { light: string };
}

interface ItemType {
  code: string;
  name: string;
  full_name: string;
  normalized_name: string;
  normalized_full_name: string;
  number_code?: string;
  color: { light: string; dark: string }; // Include dark here
  accent_color: { light: string; dark: string }; // Include dark here
}

type DataType = 'bank' | 'store' | 'ewallet';

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

  // Darken the color more gradually
  l = Math.max(0.1, Math.min(0.4, l * 0.6));

  // Adjust saturation to maintain color vibrancy
  s = Math.min(1, s * 1.15);

  // Slight hue shift for variety
  h = (h + 3) % 360;

  return tinycolor({ h, s, l }).toHexString();
}
class DataManager {
  private dataByCode: Record<DataType, Record<string, ItemType>> = {
    bank: {},
    store: {},
    ewallet: {}
  };
  private searchIndex: Record<DataType, Map<string, Set<string>>> = {
    bank: new Map(),
    store: new Map(),
    ewallet: new Map()
  };

  constructor() {
    this.initializeData();
  }

  private initializeData(): void {
    const dataTypes: DataType[] = ['bank', 'store', 'ewallet'];

    for (const type of dataTypes) {
      const items = enDatas[type];
      if (!items) continue;

      for (const item of items) {
        const { code, name, full_name } = item;
        const normalizedName = normalizeText(name);
        const normalizedFullName = normalizeText(full_name);

        const colorData = (colorConfig as Record<string, ColorInfo>)[code] || {
          color: { light: '' },
          accent_color: { light: '' }
        };

        this.dataByCode[type][code] = {
          ...item,
          normalized_name: normalizedName,
          normalized_full_name: normalizedFullName,
          color: { light: colorData.color.light, dark: getDarkModeColor(colorData.color.light) },
          accent_color: { light: colorData.accent_color.light, dark: getDarkModeColor(colorData.accent_color.light) }
        };

        this.addSearchTerms(type, code, normalizedName, normalizedFullName);
      }
    }
  }

  private addSearchTerms(type: DataType, code: string, ...terms: string[]): void {
    for (const term of terms) {
      const typeIndex = this.searchIndex[type];
      const existingCodes = typeIndex.get(term) || new Set<string>();
      existingCodes.add(code);
      typeIndex.set(term, existingCodes);
    }
  }

  public getItemData(code: string, type: DataType): ItemType {
    return this.dataByCode[type]?.[code] || {
      code: '',
      name: '',
      full_name: '',
      normalized_name: '',
      normalized_full_name: '',
      number_code: '',
      color: { light: '', dark: '' },
      accent_color: { light: '', dark: '' }
    };
  }

  public searchItems(searchTerm: string, types?: DataType[]): string[] {
    const normalizedSearchTerm = normalizeText(searchTerm);
    const matchingCodes = new Set<string>();
    const searchTypes = types || ['bank', 'store', 'ewallet'];

    for (const type of searchTypes) {
      const typeSearchIndex = this.searchIndex[type];
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
  }
}

const dataManager = new DataManager();

export const returnItemData = (code: string, type: DataType) => 
  dataManager.getItemData(code, type);

export const returnItemCode = (searchTerm: string, type?: DataType) => 
  dataManager.searchItems(searchTerm, type ? [type] : undefined);