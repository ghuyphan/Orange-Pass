import { MaterialIcons } from '@expo/vector-icons';
import WifiManager from 'react-native-wifi-reborn';
import { t } from '@/i18n';

type MaterialIconsIconName = keyof typeof MaterialIcons.glyphMap;

interface ProcessScannedCodeProps {
  codeMetadata: string;
  isConnecting: boolean;
  quickScan?: boolean;
  setCodeType: (type: string) => void;
  setIconName: (name: MaterialIconsIconName) => void;
  setCodeValue: (value: string) => void;
  setIsConnecting: (connecting: boolean) => void;
}

export const processScannedCode = ({
  codeMetadata,
  isConnecting,
  quickScan,
  setCodeType,
  setIconName,
  setCodeValue,
  setIsConnecting,
}: ProcessScannedCodeProps) => {
  const patterns = {
    WIFI: {
      pattern: /^WIFI:/,
      handler: () => {
        const ssidMatch = codeMetadata.match(/S:([^;]*)/);
        const passMatch = codeMetadata.match(/P:([^;]*)/);
        const isWepMatch = codeMetadata.match(/T:([^;]*)/);

        const ssid = ssidMatch ? ssidMatch[1] : 'Unknown';
        setCodeType('WIFI');
        setIconName('wifi');
        setCodeValue(`${t('scanScreen.join')} "${ssid}" ${t('scanScreen.join2')}`);

        if (quickScan) {
          const password = passMatch ? passMatch[1] : '';
          const isWep = isWepMatch ? isWepMatch[1] === 'WEP' : undefined;

          setIsConnecting(true);
          WifiManager.connectToProtectedWifiSSID({
            ssid,
            password,
            isWEP: isWep,
          }).then(
            () => {
              setIsConnecting(false);
            },
            (error) => {
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
        setIconName('explore');
        setCodeValue(`${t('scanScreen.goto')} "${url}"`);
      },
    },
    VietQR: {
      pattern: /^000201010211/,
      handler: () => {
        if (codeMetadata.includes('MOMO')) {
          setCodeType('ewallet');
          setIconName('qr-code');
          setCodeValue(`${t('scanScreen.momoPayment')}`);
        } else if (codeMetadata.includes('zalopay')) {
          setCodeType('ewallet');
          setIconName('qr-code');
          setCodeValue(`${t('scanScreen.zalopayPayment')}`);
        } else {
          setCodeType('card');
          setIconName('qr-code');
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
};
