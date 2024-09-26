import { useCallback } from 'react';
import { throttle } from 'lodash';
import WifiManager from 'react-native-wifi-reborn';
import { t } from '@/i18n';
import Ionicons from '@expo/vector-icons/Ionicons';

interface Pattern {
  pattern: RegExp;
  handler: () => void;
}

// Define the type for Ionicons glyphs (icon names)
type IoniconsIconName = keyof typeof Ionicons.glyphMap;

interface UseHandleCodeScannedProps {
  isConnecting: boolean;
  quickScan?: boolean;
  setCodeType: (type: string) => void;
  setIconName: (name: IoniconsIconName) => void;
  setCodeValue: (value: string) => void;
  setIsConnecting: (connecting: boolean) => void;
}

const useHandleCodeScanned = ({
  isConnecting,
  quickScan,
  setCodeType,
  setIconName,
  setCodeValue,
  setIsConnecting,
}: UseHandleCodeScannedProps) => {
  const handleCodeScanned = useCallback(
    throttle((codeMetadata: string) => {
      if (isConnecting) return;

      const patterns: { [key: string]: Pattern } = {
        WIFI: {
          pattern: /^WIFI:/,
          handler: () => {
            const ssidMatch = codeMetadata.match(/S:([^;]*)/);
            const passMatch = codeMetadata.match(/P:([^;]*)/);
            const isWepMatch = codeMetadata.match(/T:([^;]*)/);

            console.log({ ssidMatch, passMatch, isWepMatch });

            const ssid = ssidMatch ? ssidMatch[1] : 'Unknown';
            setCodeType('WIFI');
            setIconName('wifi'); // Ionicons icon name

            setCodeValue(`${t('scanScreen.join')} "${ssid}" ${t('scanScreen.join2')}`);

            if (quickScan) {
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
          },
        },
        URL: {
          pattern: /^(https:\/\/|http:\/\/)/,
          handler: () => {
            const url = codeMetadata.replace(/^https?:\/\//, '');
            setCodeType('URL');
            setIconName('compass'); // Ionicons icon name
            setCodeValue(`${t('scanScreen.goto')} "${url}"`);
          },
        },
        VietQR: {
          pattern: /^000201010211/,
          handler: () => {
            if (codeMetadata.includes('MOMO')) {
              setCodeType('ewallet');
              setIconName('qr-code'); // Ionicons icon name
              setCodeValue(`${t('scanScreen.momoPayment')}`);
            } else if (codeMetadata.includes('zalopay')) {
              setCodeType('ewallet');
              setIconName('qr-code'); // Ionicons icon name
              setCodeValue(`${t('scanScreen.zalopayPayment')}`);
            } else {
              setCodeType('card');
              setIconName('qr-code'); // Ionicons icon name
              setCodeValue(codeMetadata);
            }
          },
        },
      };

      for (const key in patterns) {
        const { pattern, handler } = patterns[key];
        if (pattern.test(codeMetadata)) {
          handler();
          return;
        }
      }

      setCodeType('unknown');
      setCodeValue(t('scanScreen.unknownCode'));
    }, 500),
    [isConnecting, quickScan]
  );

  return handleCodeScanned;
};

export default useHandleCodeScanned;
