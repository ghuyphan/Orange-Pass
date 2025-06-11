import tinycolor from 'tinycolor2';
import Datas from '@/assets/Datas.json'; // Assuming type structure { bank: ItemDef[], store: ItemDef[], ... }
import colorConfig from '@/assets/color-config.json'; // Assuming type structure { [code: string]: ColorInfo }
import vietQRBanksData from '@/assets/vietQRBanks.json'; // Assuming type structure { banks: VietQRBankDef[] }
import DataType from '@/types/dataType';

// --- Interfaces ---

interface ColorInfo {
  color: { light: string };
  accent_color: { light: string };
}

// Define the expected structure from Datas.json items if not already typed
interface ItemDefinition {
    code: string;
    name: string;
    full_name: Record<string, string>; // e.g., { en: "...", vi: "..." }
    bin?: string;
    // Other fields from Datas.json if needed
}

// Define the expected structure from vietQRBanks.json items
interface VietQRBankDefinition {
    code: string;
    name: string;
    full_name: string; // Assuming a single string in the source JSON
    bin?: string;
    // Other fields from vietQRBanks.json if needed
}

// Combined and processed item structure used internally
interface ItemType {
  code: string;
  name: string;
  full_name: Record<string, string>; // Standardized to multi-language record
  normalized_name: string;
  normalized_full_name: string; // Based on the primary locale during init
  bin?: string;
  color: { light: string; dark: string };
  accent_color: { light: string; dark: string };
}

// Structure returned by getItemData
interface ItemDataWithType extends ItemType {
  type: DataType;
}

// --- Utility Functions ---

const normalizeTextCache = new Map<string, string>();

function normalizeText(text: string): string {
  if (!text) return ''; // Handle potential null/undefined input
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
  if (!lightColor) return '#333333'; // Return a default dark color if light color is missing
  try {
    const color = tinycolor(lightColor);
    if (!color.isValid()) return '#333333'; // Handle invalid color strings

    let { h, s, l } = color.toHsl();

    // Adjust luminosity and saturation for dark mode
    l = Math.max(0.18, Math.min(0.48, l * 0.58)); // Adjust luminosity range/factor as needed
    s = Math.min(1, s * 1.05); // Slightly increase saturation
    h = (h + 3) % 360; // Slightly shift hue

    return tinycolor({ h, s, l }).toHexString();
  } catch (error) {
      console.error(`Error processing color ${lightColor}:`, error);
      return '#333333'; // Fallback color on error
  }
}

// --- Data Manager ---

const createDataManager = (primaryLocale: string = 'vi') => { // Use 'vi' as default locale based on export
   (`[DataManager] Initializing with primary locale: ${primaryLocale}`);
  const startTime = performance.now();

  // --- Data Stores ---
  // Stores fully processed data keyed by type, then code
  const dataByCode: Record<DataType, Record<string, ItemType>> = {
    bank: {},
    store: {},
    ewallet: {},
    vietqr: {}, // Initialize vietqr section
  };

  // Stores search terms -> Set<codes> mappings for quick lookup
  const searchIndex: Record<DataType, Map<string, Set<string>>> = {
    bank: new Map(),
    store: new Map(),
    ewallet: new Map(),
    vietqr: new Map(), // Initialize vietqr section
  };

  // --- Helper Functions ---
  const addSearchTerms = (
    type: DataType,
    code: string,
    ...terms: string[]
  ): void => {
    const typeIndex = searchIndex[type];
    if (!typeIndex) return; // Should not happen if initialized correctly

    for (const term of terms) {
      if (!term) continue; // Skip empty terms
      const existingCodes = typeIndex.get(term) || new Set<string>();
      existingCodes.add(code);
      typeIndex.set(term, existingCodes);
    }
  };

  const processDataItems = (
    type: DataType,
  ): void => {
    const items: ItemDefinition[] = (Datas as any)[type]; // Cast Datas if structure is known
    if (!items || !Array.isArray(items)) {
        console.warn(`[DataManager] No items found or invalid format for type: ${type}`);
        return;
    }
     (`[DataManager] Processing ${items.length} items for type: ${type}`);

    for (const item of items) {
      if (!item || !item.code || !item.name || !item.full_name) {
          console.warn(`[DataManager] Skipping invalid item in type ${type}:`, item);
          continue;
      }
      const { code, name } = item;
      const primaryFullName = item.full_name[primaryLocale] || item.full_name['en'] || name; // Fallback logic for full name
      const normalizedName = normalizeText(name);
      const normalizedPrimaryFullName = normalizeText(primaryFullName);

      // Get color configuration, providing a default if not found
      const colorData = (colorConfig as Record<string, ColorInfo>)[code] || {
        color: { light: '#CCCCCC' }, // Default light grey
        accent_color: { light: '#AAAAAA' }, // Default darker grey
      };

      const lightColor = colorData.color.light;
      const lightAccentColor = colorData.accent_color.light;

      dataByCode[type][code] = {
        code: code,
        name: name,
        full_name: item.full_name, // Store the original multi-language object
        normalized_name: normalizedName,
        normalized_full_name: normalizedPrimaryFullName, // Store normalized version of primary locale's full name
        bin: item.bin,
        color: {
          light: lightColor,
          dark: getDarkModeColor(lightColor),
        },
        accent_color: {
          light: lightAccentColor,
          dark: getDarkModeColor(lightAccentColor),
        },
      };

      // Add search terms for name and all available full names
      addSearchTerms(type, code, normalizedName);
      for (const localeKey in item.full_name) {
        addSearchTerms(type, code, normalizeText(item.full_name[localeKey]));
      }
    }
  };

  const processVietQRData = (): void => {
      const banks: VietQRBankDefinition[] = vietQRBanksData.banks;
      if (!banks || !Array.isArray(banks)) {
          console.warn(`[DataManager] No VietQR banks found or invalid format.`);
          return;
      }
       (`[DataManager] Processing ${banks.length} items for type: vietqr`);
      const type: DataType = 'vietqr';
      const defaultLightColor = '#1E90FF'; // Default blue for VietQR
      const defaultDarkColor = getDarkModeColor(defaultLightColor);

      for (const bank of banks) {
          if (!bank || !bank.code || !bank.name || !bank.full_name) {
              console.warn(`[DataManager] Skipping invalid VietQR bank:`, bank);
              continue;
          }
          const { code, name, full_name } = bank; // Assuming full_name is a single string in JSON
          const normalizedName = normalizeText(name);
          const normalizedFullName = normalizeText(full_name);

          // Create the standardized ItemType structure
          dataByCode[type][code] = {
              code: code,
              name: name,
              // Standardize full_name to multi-language record
              full_name: {
                  en: full_name, // Use the provided full_name for default locales
                  vi: full_name,
                  ru: full_name, // Add/adjust locales as needed
              },
              normalized_name: normalizedName,
              normalized_full_name: normalizedFullName,
              bin: bank.bin,
              color: { light: defaultLightColor, dark: defaultDarkColor },
              accent_color: { light: defaultLightColor, dark: defaultDarkColor }, // Assuming accent = color
          };

          // Add search terms
          addSearchTerms(type, code, normalizedName, normalizedFullName);
      }
  };


  // --- Initialization ---
  const initializeData = (): void => {
    const initStartTime = performance.now();
    // Process standard types from Datas.json
    const dataTypes: DataType[] = ['bank', 'store', 'ewallet'];
    for (const type of dataTypes) {
      processDataItems(type);
    }

    // Process VietQR type from vietQRBanks.json
    processVietQRData();

     (`[DataManager] Data initialization complete. Took: ${performance.now() - initStartTime}ms`);
  };

  initializeData(); // Run initialization when the manager is created

  // --- Public Methods ---

  const getItemData = (code: string, type?: DataType): ItemDataWithType | null => {
    const typesToSearch: DataType[] = type ? [type] : ['bank', 'store', 'ewallet', 'vietqr'];

    for (const currentType of typesToSearch) {
      const itemData = dataByCode[currentType]?.[code];
      if (itemData) {
        return {
          ...itemData,
          type: currentType, // Add the type field
        };
      }
    }
    console.warn(`[DataManager] Item not found for code: ${code}, type(s): ${typesToSearch.join(', ')}`);
    return null; // Return null instead of a default object if not found
  };

  const getItemsByType = (type: DataType): ItemType[] => {
    //  (`[DataManager] getItemsByType called for: ${type}`); // Optional: for debugging
    if (dataByCode[type]) {
      // Return the array of pre-processed items
      return Object.values(dataByCode[type]);
    }
    console.warn(`[DataManager] No data found for type: ${type}`);
    return []; // Return empty array if type doesn't exist or has no data
  };

  const searchItems = (searchTerm: string, types?: DataType[]): ItemType[] => {
    const normalizedSearchTerm = normalizeText(searchTerm);
    if (!normalizedSearchTerm) return []; // No search term provided

    const matchingCodes = new Set<string>();
    const searchTypes = types || ['bank', 'store', 'ewallet', 'vietqr'];

    for (const type of searchTypes) {
      const typeSearchIndex = searchIndex[type];
      if (!typeSearchIndex) continue;

      // Check for exact match first (more relevant)
      const exactMatchCodes = typeSearchIndex.get(normalizedSearchTerm);
      if (exactMatchCodes) {
        exactMatchCodes.forEach((code) => matchingCodes.add(code));
      }

      // Check for partial matches (if search term is longer than 1 char)
      if (normalizedSearchTerm.length > 1) {
        for (const [term, codes] of typeSearchIndex.entries()) {
          // Check if indexed term starts with or includes the search term
          if (term.startsWith(normalizedSearchTerm) || term.includes(normalizedSearchTerm)) {
            codes.forEach((code) => matchingCodes.add(code));
          }
        }
      }
    }

    // Convert codes back to full ItemType objects
    const results: ItemType[] = [];
    matchingCodes.forEach(code => {
        // Need to find which type this code belongs to
        for (const type of searchTypes) {
            if (dataByCode[type]?.[code]) {
                results.push(dataByCode[type][code]);
                break; // Found the item, move to next code
            }
        }
    });

    // Optionally sort results (e.g., prioritize exact matches or sort alphabetically)
    // results.sort(...);

    return results;
  };


  const getItemCodeByBin = (bin: string): string | null => {
      if (!bin) return null;
      // Access pre-processed bank data directly
      const bankItems = dataByCode['bank'];
      for (const code in bankItems) {
          if (bankItems[code].bin === bin) {
              return code;
          }
      }
      // Also check VietQR banks if bins are stored there
      const vietQRItems = dataByCode['vietqr'];
       for (const code in vietQRItems) {
          if (vietQRItems[code].bin === bin) {
              return code;
          }
      }
      return null;
  };

   (`[DataManager] Manager created. Total time: ${performance.now() - startTime}ms`);

  // Return the public API
  return {
    getItemData,
    getItemsByType,
    searchItems,
    getItemCodeByBin,
  };
};

// --- Instantiate and Export ---

// Instantiate the manager once with the desired primary locale
const dataManager = createDataManager('vi'); // Or 'en', etc.

// Export the methods bound to the single instance
export const returnItemData = (code: string, type?: DataType): ItemDataWithType | null =>
  dataManager.getItemData(code, type);

export const returnItemsByType = (type: DataType): ItemType[] =>
  dataManager.getItemsByType(type);

// Updated search to return full items instead of just codes
export const returnItems = (searchTerm: string, types?: DataType[]): ItemType[] =>
  dataManager.searchItems(searchTerm, types);

export const returnItemCodeByBin = (bin: string): string | null =>
  dataManager.getItemCodeByBin(bin);

// Note: The old export 'returnItemCode' might need updating if consuming code expects only codes.
// If you still need just codes, you can adapt the searchItems method or add a new one.
// Example: export const returnItemCodes = (searchTerm: string, types?: DataType[]) =>
//   dataManager.searchItems(searchTerm, types).map(item => item.code);