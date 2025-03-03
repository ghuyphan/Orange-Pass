import { MaterialIcons } from '@expo/vector-icons';

type MaterialIconsIconName = keyof typeof MaterialIcons.glyphMap;

export interface BaseScanResult {
  codeType: string;
  iconName: MaterialIconsIconName;
  codeFormat?: number;
  rawCodeValue: string;
}

export interface WifiScanResult extends BaseScanResult {
  codeType: 'WIFI';
  ssid: string;
  password: string; // Changed from 'pass' to 'password' for clarity
  isWEP: boolean;    // No longer optional.  It's always a boolean.
  isHidden: boolean; // Added isHidden
}

export interface URLScanResult extends BaseScanResult {
  codeType: 'URL';
  url: string;
}

export interface VietQRScanResult extends BaseScanResult {
  codeType: 'bank' | 'ewallet';
  bin: string;
  provider?: string;
  merchantNumber?: string;
  merchantName?: string;
  additionalData?: {
    billNumber?: string;
    reference?: string;
  };
}

export interface AlphanumericScanResult extends BaseScanResult {
  codeType: 'alphanumeric';
}

export interface UnknownScanResult extends BaseScanResult {
  codeType: 'unknown';
}

export type ScanResult =
  | WifiScanResult
  | URLScanResult
  | VietQRScanResult
  | AlphanumericScanResult
  | UnknownScanResult;

export interface ExtractionOptions {
  codeFormat?: number;
  t?: (key: string) => string; // For internationalization, optional
  setIsConnecting?: (connecting: boolean) => void;  // For Wifi connection, optional - Consider removing if unused
}

export interface ScanPattern {
  type: string;
  iconName: MaterialIconsIconName;
  match: (code: string) => boolean;
  extract: (code: string, options: ExtractionOptions) => ScanResult;
}

// Consider using an enum for providers:
export enum ProviderId {
  MOMO = 'MOMO',
  ZALOPAY = 'ZALOPAY',
}

export const PROVIDERS = {
  [ProviderId.MOMO]: {
    id: ProviderId.MOMO,
    bin: '970454',
    identifiers: ['MM', 'MOMOW2W'],
    extractMerchantNumber: (data: { [key: string]: string }) => {
      const merchantData = data['27'] || '';
      const match = merchantData.match(/970454(\d{6,})/);
      return match?.[1];
    }
  },
  [ProviderId.ZALOPAY]: {
    id: ProviderId.ZALOPAY,
    bin: '970454',
    identifiers: ['ZP', 'vn.zalopay'],
    extractMerchantNumber: (data: { [key: string]: string }) => {
      const merchantData = data['27'] || '';
      const match = merchantData.match(/970454(\d{6,})/);
      return match?.[1];
    }
  }
} as const;

export const parseEMVQR = (qrData: string) => {
  const fields: { [key: string]: string } = {};
  let position = 0;

  while (position < qrData.length) {
    try {
      const id = qrData.substr(position, 2);
      const length = parseInt(qrData.substr(position + 2, 2), 10); // Specify radix 10
      if (isNaN(length)) break;
      const value = qrData.substr(position + 4, length);
      fields[id] = value;
      position += 4 + length;
    } catch (e) {
      console.error('Error parsing EMV QR code field:', e);
      break;
    }
  }

  return fields;
};

export const detectProvider = (qrData: string, fields: { [key: string]: string }): string | undefined => {
    for (const provider of Object.values(PROVIDERS)) { // Iterate over provider objects directly
        if (provider.identifiers.some(id => qrData.includes(id))) {
            return provider.id;
        }
    }

    for (let i = 26; i <= 45; i++) {
      const field = fields[i.toString()];
      if (field) {
          for (const provider of Object.values(PROVIDERS)) {
            if (provider.identifiers.some(id => field.includes(id))) {
                return provider.id;
              }
          }
      }
    }

    return undefined;
};
//extractBIN and extractBankMerchantNumber are redundant, if you're not using the bin from other provider, you should remove both.
export const extractBIN = (merchantInfo: string): string => {
  const binMatch = merchantInfo.match(/(?:27|38)\d{8}(\d{6})/);
  if (binMatch) return binMatch[1];

  const altBinMatch = merchantInfo.match(/\d{6}/);
  return altBinMatch ? altBinMatch[0] : 'Unknown BIN';
};

export const extractMerchantName = (field62?: string): string | undefined => {
  if (!field62) return undefined;

  const nameMatch = field62.match(/08([^]+?)(?=\d{2}|$)/);
  return nameMatch ? nameMatch[1].trim() : undefined;
};

export const extractBankMerchantNumber = (merchantInfo: string, bin: string): string | undefined => {
  if (bin === 'Unknown BIN') return undefined;

  const regex = new RegExp(`${bin}(\\d{6,})`);
  const match = merchantInfo.match(regex);
  return match ? match[1] : undefined;
};

export const extractField = (fieldData: string, fieldId: string): string | undefined => {
  const regex = new RegExp(`${fieldId}([^]+?)(?=\\d{2}|$)`); // Improved regex
  const match = fieldData.match(regex);
  return match ? match[1].trim() : undefined;
};


export const SCAN_PATTERNS: ScanPattern[] = [
  {
    type: 'WIFI',
    iconName: 'wifi',
    match: (code) => code.startsWith('WIFI:'),
    extract: (code, options) => {
      // More robust Wi-Fi parsing, handling optional parameters and escaping:
      const wifiRegex = /^WIFI:S:(?<ssid>[^;]*);T:(?<type>[^;]*);P:(?<password>[^;]*)(?:;H:(?<hidden>true|false))?;;$/;
      const match = code.match(wifiRegex);

      if (!match?.groups) {
        return { // Return an unknown type if parsing fails
            codeType: 'unknown',
            iconName: 'help',
            rawCodeValue: code
        }
      }
      const { ssid, type, password, hidden } = match.groups;

      return {
        codeType: 'WIFI',
        iconName: 'wifi',
        codeFormat: options.codeFormat,
        rawCodeValue: code,
        ssid: ssid || '', // Handle missing SSID
        password: password || '', // Handle missing password
        isWEP: (type?.toUpperCase() ?? '') === 'WEP',
        isHidden: hidden === 'true', // Convert string to boolean, defaults to false
      };
    },
  },
  {
    type: 'URL',
    iconName: 'explore',
    match: (code) => code.startsWith('http://') || code.startsWith('https://'),
    extract: (code, options) => ({
      codeType: 'URL',
      iconName: 'explore',
      codeFormat: options.codeFormat,
      rawCodeValue: code,
      url: code, // No need to remove "https://" anymore
    }),
  },
  {
    type: 'VietQR',
    iconName: 'qr-code',
    match: (code) => code.startsWith('0002010102'),
    extract: (code, options) => {
      const fields = parseEMVQR(code);
      const merchantInfo = fields['38'] || fields['27'] || '';
      const provider = detectProvider(code, fields);
      const providerConfig = provider ? PROVIDERS[provider as keyof typeof PROVIDERS] : undefined;

      let merchantNumber;
      let bin;

      if (providerConfig) {
        merchantNumber = providerConfig.extractMerchantNumber(fields);
        bin = providerConfig.bin;
      } else {
        bin = extractBIN(merchantInfo);
        merchantNumber = extractBankMerchantNumber(merchantInfo, bin);
      }

      const field62 = fields['62'];
      const merchantName = extractMerchantName(field62);

      const additionalData = field62
        ? {
          billNumber: extractField(field62, '01'),
          reference: extractField(field62, '05'),
        }
        : undefined;

      return {
        codeType: provider ? 'ewallet' : 'bank',
        iconName: 'qr-code',
        codeFormat: options.codeFormat,
        rawCodeValue: code,
        bin: bin || 'Unknown',
        provider: provider,
        merchantNumber: merchantNumber,
        merchantName: merchantName,
        additionalData: additionalData,
      };
    },
  },
  {
    type: 'Alphanumeric',
    iconName: 'text-fields',
    match: (code) => /^[a-zA-Z0-9:; +]+$/.test(code), // Consider a broader regex if needed
    extract: (code, options) => ({
      codeType: 'alphanumeric',
      iconName: 'text-fields',
      codeFormat: options.codeFormat,
      rawCodeValue: code,
    }),
  },
  {  // unknown type should always be the last
    type: 'unknown',
    iconName: 'help',
    match: () => true, // Always matches as the last resort
    extract: (code, options) => ({
      codeType: 'unknown',
      iconName: 'help',
      rawCodeValue: code,
    }),
  },
];

// This function is likely unnecessary now, as you can directly access SCAN_PATTERNS
export const findPatternByType = (codeType: string): ScanPattern | undefined => {
  return SCAN_PATTERNS.find(pattern => pattern.type === codeType);
};

export const analyzeCode = (
  codeMetadata: string,
  options: ExtractionOptions
): ScanResult => {
  const pattern = SCAN_PATTERNS.find((p) => p.match(codeMetadata));

  if (pattern) {
    return pattern.extract(codeMetadata, options);
  }
  // This should never happen, as the last pattern always match
  return {
    codeType: 'unknown',
    iconName: 'help',
    rawCodeValue: codeMetadata,
  } as UnknownScanResult;
};