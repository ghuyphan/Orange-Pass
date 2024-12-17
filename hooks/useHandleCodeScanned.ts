import { useCallback } from 'react';
import { throttle } from 'lodash';
import WifiManager from 'react-native-wifi-reborn';
import { MaterialIcons } from '@expo/vector-icons';

// Define the type for Ionicons glyphs (icon names)
type MaterialIconsIconName = keyof typeof MaterialIcons.glyphMap;

interface ScanResult {
  codeType: string;
  iconName: MaterialIconsIconName;
  codeValue: string;
  codeFormat?: number;
  bin?: string; // Add bin property to ScanResult
}

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
        const format = options.codeFormat;
        console.log(codeMetadata);

        const patterns: { [key: string]: Pattern } = {
          WIFI: {
            pattern: /^WIFI:/,
            handler: (codeMetadata, { quickScan, t }) => {
              const ssidMatch = codeMetadata.match(/S:([^;]*)/);
              const passMatch = codeMetadata.match(/P:([^;]*)/);
              const isWepMatch = codeMetadata.match(/T:([^;]*)/);

              const ssid = ssidMatch ? ssidMatch[1] : 'Unknown';

              const result: ScanResult = {
                codeType: 'WIFI',
                iconName: 'wifi',
                codeValue: `${t('scanScreen.join')} "${ssid}" ${t('scanScreen.join2')}`,
                codeFormat: format,
              };

              if (quickScan && setIsConnecting) {
                const password = passMatch ? passMatch[1] : '';
                const isWep = isWepMatch ? isWepMatch[1] === 'WEP' : undefined;

                setIsConnecting(true);
                WifiManager.connectToProtectedWifiSSID({
                  ssid: ssid,
                  password: password,
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
            handler: (codeMetadata, { t }) => {
              const url = codeMetadata.replace(/^https?:\/\//, '');
              return {
                codeType: 'URL',
                iconName: 'explore',
                codeValue: `${t('scanScreen.goto')} "${url}"`,
                codeFormat: format,
              };
            },
          },
          VietQR: {
            pattern: /^000201010211/,
            handler: (codeMetadata, { t }) => {
              const binMatch = codeMetadata.match(/27\d{8}(\d{6})/);
              const bin = binMatch ? binMatch[1] : 'Unknown BIN';
              console.log(bin);
              
              let result: ScanResult = {
                codeType: 'card',
                iconName: 'qr-code',
                codeValue: codeMetadata,
                codeFormat: format,
                bin: bin, // Include bin in the result
              };

              if (codeMetadata.includes('MOMO')) {
                result = {
                  codeType: 'ewallet',
                  iconName: 'qr-code',
                  // codeValue: `${t('scanScreen.momoPayment')}`,
                  codeValue: codeMetadata,
                  codeFormat: format,
                  bin: bin, // Include bin in the result
                };
              } else if (codeMetadata.includes('zalopay')) {
                result = {
                  codeType: 'ewallet',
                  iconName: 'qr-code',
                  codeValue: `${t('scanScreen.zalopayPayment')}`,
                  codeFormat: format,
                  bin: bin, // Include bin in the result
                };
              }

              return result;
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
          iconName: 'help', // Default icon for unknown
          codeValue: t('scanScreen.unknownCode'),
        };
      },
      500
    ),
    []
  );

  return handleCodeScanned;
};

export default useHandleCodeScanned;