import { useCallback } from 'react';
import { throttle } from 'lodash';
import WifiManager from 'react-native-wifi-reborn';
import { MaterialIcons } from '@expo/vector-icons';

// Define the type for MaterialIcons glyphs (icon names)
type MaterialIconsIconName = keyof typeof MaterialIcons.glyphMap;

// --- Interfaces for ScanResult ---

interface BaseScanResult {
  codeType: string;
  iconName: MaterialIconsIconName;
  codeFormat?: number;
  rawCodeValue: string; // Store the raw scanned value
}

// Specific ScanResult types
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
  provider?: string; // To identify e-wallets like Momo, ZaloPay
}

interface AlphanumericScanResult extends BaseScanResult {
  codeType: 'alphanumeric';
}

interface UnknownScanResult extends BaseScanResult {
  codeType: 'unknown';
}

// Union type for ScanResult
type ScanResult =
  | WifiScanResult
  | URLScanResult
  | VietQRScanResult
  | AlphanumericScanResult
  | UnknownScanResult;

// --- Pattern Interface ---

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

// --- E-wallet Identifiers ---
const ewalletIdentifiers = {
  MOMO: 'MOMO',
  ZALOPAY: 'zalopay', // Updated to match the actual identifier in the data
  // Add more identifiers as needed:
  // VNPAY: 'VNPAYQR',
  // SHOPEEPAY: 'SHOPEEPAY',
  // VIETTELPAY: 'VIETTELPAY',
};

// --- Main Hook ---

const useHandleCodeScanned = () => {
  const handleCodeScanned = useCallback(
    throttle(
      (
        codeMetadata: string,
        options: {
          quickScan?: boolean;
          codeFormat?: number;
          t: (key: string) => string; // Translation function
          setIsConnecting?: (connecting: boolean) => void;
        }
      ): ScanResult => {
        const { quickScan, t, setIsConnecting, codeFormat } = options;

        const patterns: { [key: string]: Pattern } = {
          WIFI: {
            pattern: /^WIFI:/,
            handler: (
              codeMetadata,
              { quickScan, t, setIsConnecting, codeFormat }
            ) => {
              const ssidMatch = codeMetadata.match(/S:([^;]*)/);
              const passMatch = codeMetadata.match(/P:([^;]*)/);
              const isWepMatch = codeMetadata.match(/T:([^;]*)/);

              const ssid = ssidMatch ? ssidMatch[1] : 'Unknown';
              const pass = passMatch ? passMatch[1] : '';
              const isWep = isWepMatch
                ? isWepMatch[1] === 'WEP'
                : undefined;

              const result: WifiScanResult = {
                codeType: 'WIFI',
                iconName: 'wifi',
                codeFormat: codeFormat,
                rawCodeValue: codeMetadata,
                ssid: ssid,
                pass: pass,
                isWep: isWep,
              };

              if (quickScan && setIsConnecting) {
                setIsConnecting(true);
                WifiManager.connectToProtectedWifiSSID({
                  ssid: ssid,
                  password: pass,
                  isWEP: isWep,
                }).then(
                  () => {
                    console.log('Connected successfully!');
                    setIsConnecting(false);
                  },
                  (error) => {
                    console.log('Connection failed!', error);
                    setIsConnecting(false);
                  }
                );
              }

              return result;
            },
          },

          URL: {
            pattern: /^(https:\/\/|http:\/\/)/,
            handler: (codeMetadata, { t, codeFormat }) => {
              const url = codeMetadata.replace(/^https?:\/\//, '');
              return {
                codeType: 'URL',
                iconName: 'explore',
                codeFormat: codeFormat,
                rawCodeValue: codeMetadata,
                url: url,
              };
            },
          },

          VietQR: {
            pattern: /^0002010102\d{2}/, // Updated pattern to match more VietQR versions
            handler: (codeMetadata, { t, codeFormat }) => {
              const binMatch = codeMetadata.match(/(?:27|38)\d{8}(\d{6})/); // Updated regex
              const bin = binMatch ? binMatch[1] : 'Unknown BIN';

              // **Improved E-wallet Identification:**
              let provider = undefined;
              // Extract the relevant part of the QR code for e-wallet detection (after "vn.")
              const ewalletSectionMatch = codeMetadata.match(/vn\.(.*?)(?:\d{2}|$)/);
              // console.log('ewalletSectionMatch:', ewalletSectionMatch);
              if (ewalletSectionMatch) {
                const ewalletSection = ewalletSectionMatch[1];
                console.log('ewalletSection:', ewalletSection);
                for (const key in ewalletIdentifiers) {
                  if (ewalletSection.includes(ewalletIdentifiers[key as keyof typeof ewalletIdentifiers])) {
                    provider = key;
                    console.log('Detected e-wallet provider:', provider);
                    break;
                  }
                }
              }

              const result: VietQRScanResult = {
                codeType: provider ? 'ewallet' : 'bank', // Set codeType based on provider
                iconName: 'qr-code',
                codeFormat: codeFormat,
                rawCodeValue: codeMetadata, // Store the raw QR code data
                bin: bin,
                provider: provider, // Store the e-wallet provider (Momo, ZaloPay, etc.)
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

        // --- Pattern Matching ---
        for (const key in patterns) {
          const { pattern, handler } = patterns[key];
          if (pattern.test(codeMetadata)) {
            return handler(codeMetadata, options);
          }
        }

        // --- Unknown Code Handling ---
        return { // Default result for unknown code types
          codeType: 'unknown',
          iconName: 'help',
          rawCodeValue: codeMetadata,
        };
      },
      500 // Throttle time in milliseconds
    ),
    []
  );

  return handleCodeScanned;
};

export default useHandleCodeScanned;