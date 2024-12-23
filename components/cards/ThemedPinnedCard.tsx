import React, { memo, useMemo } from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { ThemedText } from '../ThemedText';
import QRCode from 'react-native-qrcode-svg';
import Barcode from 'react-native-barcode-svg';
import { getIconPath } from '@/utils/returnIcon';
import { returnItemData } from '@/utils/returnItemData';
import { returnMidpointColors } from '@/utils/returnMidpointColor';
import { LinearGradient } from 'expo-linear-gradient';

export type ThemedPinnedCardProps = {
  code: string;
  type: 'bank' | 'store' | 'ewallet';
  metadata: string;
  metadata_type: 'qr' | 'barcode';
  accountName?: string;
  accountNumber?: string;
  style?: object;
};

export const ThemedPinnedCard = memo(function ThemedPinnedCard({
  code,
  type,
  metadata,
  metadata_type,
  accountName,
  accountNumber,
  style,
}: ThemedPinnedCardProps): JSX.Element {
  const { width } = useWindowDimensions();

  // Calculate dimensions with useMemo
  const qrSize = useMemo(() => width * 0.40, [width]);
  const barcodeHeight = useMemo(() => width * 0.23, [width]);
  const barcodeWidth = useMemo(() => width * 0.70, [width]);

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
        <ThemedText style={styles.companyName}>
          {name}
        </ThemedText>
      </View>

      <View style={styles.codeContainer}>
        <View style={[styles.codeWrapper, metadata_type === 'barcode' ? { paddingHorizontal: 20, paddingVertical: 15 } : {}]}>
          {metadata_type === 'qr' ? (
            <QRCode
              value={metadata}
              size={qrSize}
              // logo={iconPath}
              // logoSize={qrSize * 0.15}
              // logoBackgroundColor="white"
              // logoBorderRadius={50}
              // logoMargin={5}
              quietZone={3}
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
          {type === 'bank' && (

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
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    // padding: 20,
    paddingVertical: 15,
    paddingHorizontal: 20,
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 4 },
    // shadowOpacity: 0.1,
    // shadowRadius: 6,
    // elevation: 5,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 15,
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 25,
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
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  codeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeWrapper: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 8,
    marginBottom: 15,
    // paddingVertical: 16,
    // paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountName: {
    color: 'white',
    fontSize: 19,
    fontWeight: '600',
  },
  accountNumber: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    maxWidth: 250,
  },
});

export default ThemedPinnedCard;