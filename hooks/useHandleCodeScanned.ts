import { useCallback } from 'react';
import { throttle } from 'lodash';
import WifiManager from 'react-native-wifi-reborn';
import { MaterialIcons } from '@expo/vector-icons';

type MaterialIconsIconName = keyof typeof MaterialIcons.glyphMap;

interface BaseScanResult {
  codeType: string;
  iconName: MaterialIconsIconName;
  codeFormat?: number;
  rawCodeValue: string;
}

interface WifiScanResult extends BaseScanResult {
  codeType: 'WIFI';
  ssid: string;
  pass: string;
  isWep: boolean | undefined;
}

interface URLScanResult extends BaseScanResult {
  codeType: 'URL';
  url: string;
}

interface VietQRScanResult extends BaseScanResult {
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

interface AlphanumericScanResult extends BaseScanResult {
  codeType: 'alphanumeric';
}

interface UnknownScanResult extends BaseScanResult {
  codeType: 'unknown';
}

type ScanResult =
  | WifiScanResult
  | URLScanResult
  | VietQRScanResult
  | AlphanumericScanResult
  | UnknownScanResult;

interface Pattern {
  pattern: RegExp;
  handler: (
    codeMetadata: string,
    options: {
      quickScan?: boolean;
      codeFormat?: number;
      t: (key: string) => string;
      setIsConnecting?: (connecting: boolean) => void;
    }
  ) => ScanResult;
}

const PROVIDERS = {
  MOMO: {
    id: 'MOMO',
    bin: '970454',
    identifiers: ['MM', 'MOMOW2W'],
    extractMerchantNumber: (data: { [key: string]: string }) => {
      const merchantData = data['27'] || '';
      const match = merchantData.match(/970454(\d{6,})/);
      return match?.[1];
    }
  },
  ZALOPAY: {
    id: 'ZALOPAY',
    bin: '970454',
    identifiers: ['ZP', 'vn.zalopay'],
    extractMerchantNumber: (data: { [key: string]: string }) => {
      const merchantData = data['27'] || '';
      const match = merchantData.match(/970454(\d{6,})/);
      return match?.[1];
    }
  }
} as const;

// Parse EMV QR code fields
const parseEMVQR = (qrData: string) => {
  const fields: { [key: string]: string } = {};
  let position = 0;

  while (position < qrData.length) {
    try {
      const id = qrData.substr(position, 2);
      const length = parseInt(qrData.substr(position + 2, 2));
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

// Detect provider from QR data
const detectProvider = (qrData: string, fields: { [key: string]: string }): string | undefined => {
  // Check for e-wallet providers
  for (const [key, provider] of Object.entries(PROVIDERS)) {
    if (provider.identifiers.some(id => qrData.includes(id))) {
      return provider.id;
    }
  }

  // Check merchant info fields (26-45) for provider identifiers
  for (let i = 26; i <= 45; i++) {
    const field = fields[i.toString()];
    if (field) {
      for (const [key, provider] of Object.entries(PROVIDERS)) {
        if (provider.identifiers.some(id => field.includes(id))) {
          return provider.id;
        }
      }
    }
  }

  return undefined;
};

// Extract BIN from merchant info
const extractBIN = (merchantInfo: string): string => {
  const binMatch = merchantInfo.match(/(?:27|38)\d{8}(\d{6})/);
  if (binMatch) return binMatch[1];

  const altBinMatch = merchantInfo.match(/\d{6}/);
  return altBinMatch ? altBinMatch[0] : 'Unknown BIN';
};

// Extract merchant name from field 62
const extractMerchantName = (field62?: string): string | undefined => {
  if (!field62) return undefined;

  // Look for subfield 08 which typically contains merchant name
  const nameMatch = field62.match(/08([^]+?)(?=\d{2}|$)/);
  return nameMatch ? nameMatch[1].trim() : undefined;
};

// Extract merchant number for bank transfers
const extractBankMerchantNumber = (merchantInfo: string, bin: string): string | undefined => {
  if (bin === 'Unknown BIN') return undefined;

  // Look specifically for digits after the BIN
  const regex = new RegExp(`${bin}(\\d{6,})`);
  const match = merchantInfo.match(regex);
  return match ? match[1] : undefined;
};

const useHandleCodeScanned = () => {
  const handleCodeScanned = useCallback(
    throttle(
      (
        codeMetadata: string,
        options: {
          quickScan?: boolean;
          codeFormat?: number;
          t: (key: string) => string;
          setIsConnecting?: (connecting: boolean) => void;
        }
      ): ScanResult => {
        const { quickScan, t, setIsConnecting, codeFormat } = options;

        const patterns: { [key: string]: Pattern } = {
          WIFI: {
            pattern: /^WIFI:/,
            handler: (codeMetadata, { quickScan, t, setIsConnecting, codeFormat }) => {
              const ssidMatch = codeMetadata.match(/S:([^;]*)/);
              const passMatch = codeMetadata.match(/P:([^;]*)/);
              const isWepMatch = codeMetadata.match(/T:([^;]*)/);

              return {
                codeType: 'WIFI',
                iconName: 'wifi',
                codeFormat: codeFormat,
                rawCodeValue: codeMetadata,
                ssid: ssidMatch ? ssidMatch[1] : 'Unknown',
                pass: passMatch ? passMatch[1] : '',
                isWep: isWepMatch ? isWepMatch[1] === 'WEP' : undefined,
              };
            },
          },

          URL: {
            pattern: /^(https:\/\/|http:\/\/)/,
            handler: (codeMetadata, { t, codeFormat }) => {
              return {
                codeType: 'URL',
                iconName: 'explore',
                codeFormat: codeFormat,
                rawCodeValue: codeMetadata,
                url: codeMetadata.replace(/^https?:\/\//, ''),
              };
            },
          },

          VietQR: {
            pattern: /^0002010102/,
            handler: (codeMetadata, { t, codeFormat }) => {
              const fields = parseEMVQR(codeMetadata);

              // Get merchant information from either field 38 or 27
              const merchantInfo = fields['38'] || fields['27'] || '';

              // Detect provider (e-wallet or bank)
              const provider = detectProvider(codeMetadata, fields);
              const providerConfig = provider ? PROVIDERS[provider as keyof typeof PROVIDERS] : undefined;

              // Extract merchant number and BIN
              let merchantNumber;
              let bin;

              if (providerConfig) {
                // E-wallet case
                merchantNumber = providerConfig.extractMerchantNumber(fields);
                bin = providerConfig.bin;
              } else {
                // Bank case
                bin = extractBIN(merchantInfo);
                merchantNumber = extractBankMerchantNumber(merchantInfo, bin);
              }

              // Extract merchant name and additional data
              const field62 = fields['62'];
              const merchantName = extractMerchantName(field62);

              let additionalData;
              if (field62) {
                additionalData = {
                  billNumber: field62.match(/01(\d+)/)?.[1],
                  reference: field62.match(/05(\d+)/)?.[1],
                };
              }

              const result: VietQRScanResult = {
                codeType: provider ? 'ewallet' : 'bank',
                iconName: 'qr-code',
                codeFormat: codeFormat,
                rawCodeValue: codeMetadata,
                bin: bin || 'Unknown',
                provider: provider,
                merchantNumber: merchantNumber,
                merchantName: merchantName,
                additionalData: additionalData
              };

              return result;
            },
          },

          Alphanumeric: {
            pattern: /^[a-zA-Z0-9:]+$/, // MODIFIED REGEX
            handler: (codeMetadata, { t, codeFormat }) => {
              return {
                codeType: 'alphanumeric',
                iconName: 'text-fields', // You might want a different icon
                codeFormat: codeFormat,
                rawCodeValue: codeMetadata,
              };
            },
          },
        };

        for (const key in patterns) {
          const { pattern, handler } = patterns[key];
          if (pattern.test(codeMetadata)) {
            return handler(codeMetadata, options);
          }
        }

        return {
          codeType: 'unknown',
          iconName: 'help',
          rawCodeValue: codeMetadata,
        };
      },
      500
    ),
    []
  );

  return handleCodeScanned;
};

export default useHandleCodeScanned;