import { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { ThemedText } from '../ThemedText';
import QRCode from 'react-native-qrcode-svg';
import Barcode from 'react-native-barcode-svg';
import { getIconPath } from '@/utils/returnIcon';
import { returnItemData } from '@/utils/returnItemData';
import { returnMidpointColors } from '@/utils/returnMidpointColor';
import { LinearGradient } from 'expo-linear-gradient';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';

export type ThemedPinnedCardProps = {
  code: string;
  type: 'bank' | 'store' | 'ewallet';
  metadata: string;
  metadata_type: 'qr' | 'barcode';
  accountName?: string;
  accountNumber?: string;
  style?: object;
};

export const ThemedPinnedCard = ({
  code,
  type,
  metadata,
  metadata_type,
  accountName,
  accountNumber,
  style,
}: ThemedPinnedCardProps): JSX.Element => {
  // Calculate dimensions with useMemo
  const qrSize = useMemo(() => getResponsiveWidth(40), []);
  const barcodeHeight = useMemo(() => getResponsiveHeight(11), []);
  const barcodeWidth = useMemo(() => getResponsiveWidth(70), []);

  // Pre-calculate data with useMemo
  const itemData = useMemo(() => returnItemData(code), [code]);
  const { name, color, accent_color } = itemData;
  const iconPath = useMemo(() => getIconPath(code), [code]);

  return (
    <LinearGradient
      colors={
        returnMidpointColors(
          color?.light || '#FAF3E7',
          accent_color?.light || '#D6C4AF',
          6
        ) || ['#FAF3E7', '#D6C4AF']
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, style]}
    >
      <View style={styles.headerContainer}>
        <View style={styles.logoContainer}>
          <Image source={iconPath} style={styles.logo} resizeMode="contain" />
        </View>
        <ThemedText style={styles.companyName}>{name}</ThemedText>
      </View>

      <View style={styles.codeContainer}>
        <View
          style={[
            styles.codeWrapper,
            metadata_type === 'barcode'
              ? {
                  paddingHorizontal: getResponsiveWidth(3.6),
                  paddingVertical: getResponsiveHeight(1.8),
                }
              : {},
          ]}
        >
          {metadata_type === 'qr' ? (
            <QRCode
              value={metadata}
              size={qrSize}
              // logo={iconPath}
              // logoSize={qrSize * 0.15}
              // logoBackgroundColor="white"
              // logoBorderRadius={50}
              // logoMargin={5}
              quietZone={getResponsiveWidth(0.8)}
            />
          ) : (
            <Barcode
              height={barcodeHeight}
              maxWidth={barcodeWidth}
              value={metadata}
              format="CODE128"
            />
          )}
        </View>

        <View style={styles.infoContainer}>
          {(type === 'bank'  || type === "ewallet" ) && (
            <ThemedText type="defaultSemiBold" style={styles.accountName} numberOfLines={1}>
              {accountName}
            </ThemedText>
          )}
          <ThemedText style={styles.accountNumber} numberOfLines={1}>
            {accountNumber ? accountNumber : metadata}
          </ThemedText>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: getResponsiveWidth(4),
    paddingHorizontal: getResponsiveWidth(4.8),
    paddingVertical: getResponsiveHeight(1.8),
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveHeight(2.4),
    gap: getResponsiveWidth(3.6),
  },
  logoContainer: {
    width: getResponsiveWidth(9.6),
    height: getResponsiveWidth(9.6),
    borderRadius: getResponsiveWidth(6),
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '60%',
    height: '60%',
  },
  companyName: {
    color: 'white',
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
    flex: 1,
  },
  codeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeWrapper: {
    backgroundColor: 'white',
    borderRadius: getResponsiveWidth(4),
    padding: getResponsiveWidth(2),
    marginBottom: getResponsiveHeight(1.8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountName: {
    color: 'white',
    fontSize: getResponsiveFontSize(19),
    fontWeight: '600',
  },
  accountNumber: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: getResponsiveFontSize(15),
    maxWidth: getResponsiveWidth(60),
  },
});

export default ThemedPinnedCard;