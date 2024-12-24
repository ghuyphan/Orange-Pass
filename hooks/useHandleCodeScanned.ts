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
  merchantId?: string;
  amount?: string;
  additionalData?: {
    billNumber?: string;
    reference?: string;
    merchantName?: string;
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
    extractMerchantId: (data: { [key: string]: string }) => {
      const merchantData = data['27'] || '';
      const match = merchantData.match(/970454(\d+)/);
      return match?.[1];
    }
  },
  ZALOPAY: {
    id: 'ZALOPAY',
    bin: '970454',
    identifiers: ['ZP', 'vn.zalopay'],
    extractMerchantId: (data: { [key: string]: string }) => {
      const merchantData = data['27'] || '';
      const match = merchantData.match(/970454(\d+)/);
      return match?.[1];
    }
  }
} as const;

// Helper function to parse EMV QR code fields
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

// Helper function to detect provider
const detectProvider = (qrData: string, fields: { [key: string]: string }): string | undefined => {
  // First check for e-wallet providers
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

// Helper function to extract BIN
const extractBIN = (merchantInfo: string): string => {
  // Try standard BIN extraction first
  const binMatch = merchantInfo.match(/(?:27|38)\d{8}(\d{6})/);
  if (binMatch) return binMatch[1];

  // Try alternative BIN patterns
  const altBinMatch = merchantInfo.match(/\d{6}/);
  return altBinMatch ? altBinMatch[0] : 'Unknown BIN';
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
              
              // Extract merchant ID and BIN
              let merchantId;
              let bin;
              
              if (providerConfig) {
                // E-wallet case
                merchantId = providerConfig.extractMerchantId(fields);
                bin = providerConfig.bin;
              } else {
                // Bank case
                bin = extractBIN(merchantInfo);
                const bankMerchantMatch = merchantInfo.match(/\d{6,}/);
                merchantId = bankMerchantMatch ? bankMerchantMatch[0] : undefined;
              }
              
              // Extract amount (field 54)
              const amount = fields['54'];
              
              // Extract additional data
              let additionalData;
              const field62 = fields['62'];
              if (field62) {
                additionalData = {
                  billNumber: field62.match(/01(\d+)/)?.[1],
                  reference: field62.match(/05(\d+)/)?.[1],
                  merchantName: field62.match(/08([^]+)/)?.[1],
                };
              }

              const result: VietQRScanResult = {
                codeType: provider ? 'ewallet' : 'bank',
                iconName: 'qr-code',
                codeFormat: codeFormat,
                rawCodeValue: codeMetadata,
                bin: bin || 'Unknown',
                provider: provider,
                merchantId: merchantId,
                amount: amount,
                additionalData: additionalData
              };

              return result;
            },
          },

          Alphanumeric: {
            pattern: /^[a-zA-Z0-9]+$/,
            handler: (codeMetadata, { t, codeFormat }) => {
              return {
                codeType: 'alphanumeric',
                iconName: 'text-fields',
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