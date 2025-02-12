import { useCallback } from 'react';
import { throttle } from 'lodash';
import WifiManager from 'react-native-wifi-reborn'; // Keep this, as it might be used within an extraction function
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

interface ExtractionOptions {
  codeFormat?: number;
  t: (key: string) => string; // For internationalization
  setIsConnecting?: (connecting: boolean) => void;  // For Wifi connection
}

interface ScanPattern {
  type: string; // e.g., 'WIFI', 'URL', 'VietQR', 'Alphanumeric', 'Custom'
  iconName: MaterialIconsIconName;
  match: (code: string) => boolean; //  More flexible than RegExp
  extract: (code: string, options: ExtractionOptions) => ScanResult;
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

// Helper function to extract subfields from VietQR data (field 62)
const extractField = (fieldData: string, fieldId: string): string | undefined => {
    const regex = new RegExp(`${fieldId}([^]+?)(?=\\d{2}|$)`); // Improved regex
    const match = fieldData.match(regex);
    return match ? match[1].trim() : undefined;
  };

const SCAN_PATTERNS: ScanPattern[] = [
    {
        type: 'WIFI',
        iconName: 'wifi',
        match: (code) => code.startsWith('WIFI:'),
        extract: (code, options) => {
          // ...  (Simplified extraction logic, see below)
          const parts = code.substring(5).split(';').reduce((acc:any, part) => {
            const [key, value] = part.split(':');
            if (key && value) {
              acc[key] = value;
            }
            return acc;
          }, {});

           return {
              codeType: 'WIFI',
              iconName: 'wifi',
              codeFormat: options.codeFormat,
              rawCodeValue: code,
              ssid: parts.S || 'Unknown',
              pass: parts.P || '',
              isWep: parts.T === 'WEP', // Much cleaner
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
          url: code.replace(/^https?:\/\//, ''), // Keep this concise
        }),
      },
      {
        type: 'VietQR',
        iconName: 'qr-code',
        match: (code) => code.startsWith('0002010102'), // Keep the initial check simple
        extract: (code, options) => {
          const fields = parseEMVQR(code); // Your existing function
          const merchantInfo = fields['38'] || fields['27'] || '';
          const provider = detectProvider(code, fields);  // Keep this
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

          const additionalData = field62 ? {
              billNumber: extractField(field62, '01'),  // Use helper
              reference: extractField(field62, '05'),   // Use helper
          } : undefined;

          return {
              codeType: provider ? 'ewallet' : 'bank',
              iconName: 'qr-code',
              codeFormat: options.codeFormat,
              rawCodeValue: code,
              bin: bin || 'Unknown',
              provider: provider,
              merchantNumber: merchantNumber,
              merchantName: merchantName,
              additionalData: additionalData
          };
        },
      },
        {
            type: 'Alphanumeric',
            iconName: 'text-fields',
            match: (code) => /^[a-zA-Z0-9:]+$/.test(code), // Use .test() for matching
            extract: (code, options) => ({
                codeType: 'alphanumeric',
                iconName: 'text-fields',
                codeFormat: options.codeFormat,
                rawCodeValue: code,
            }),
        },
        {
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

const useHandleCodeScanned = () => {
    const handleCodeScanned = useCallback(
      throttle(
        (
          codeMetadata: string,
          options: ExtractionOptions
        ): ScanResult => {
          const pattern = SCAN_PATTERNS.find((p) => p.match(codeMetadata));

          if (pattern) {
            return pattern.extract(codeMetadata, options);
          }
          // No need for an else, unknown should be the last in SCAN_PATTERNS
          return {
            codeType: 'unknown',
            iconName: 'help',
            rawCodeValue: codeMetadata,
          } as UnknownScanResult; //this one to make sure the return is ScanResult type.
        },
        500
      ),
      []
    );

    return handleCodeScanned;
  };

  export default useHandleCodeScanned;