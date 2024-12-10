import React, { memo, useMemo } from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { ThemedText } from '../ThemedText';
import QRCode from 'react-native-qrcode-svg';
import Barcode from 'react-native-barcode-svg';
import { useTheme } from '@/context/ThemeContext';
import { getIconPath } from '@/utils/returnIcon';
import { returnItemData } from '@/utils/returnItemData';
import { returnMidpointColor } from '@/utils/returnMidpointColor';
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
  const { currentTheme } = useTheme();
  const { width } = useWindowDimensions();

  // Calculate dimensions with useMemo
  const qrSize = useMemo(() => width * 0.4, [width]);
  const barcodeHeight = useMemo(() => width * 0.25, [width]);
  const barcodeWidth = useMemo(() => width * 0.6, [width]);

  // Pre-calculate data with useMemo
  const { name, color, accent_color } = useMemo(() => returnItemData(code, type), [code, type]);
  const iconPath = useMemo(() => getIconPath(code), [code]);
  const gradientColors = useMemo(() => 
    currentTheme === 'light'
      ? [color?.light || '#ffffff', returnMidpointColor(color.light, accent_color.light) || '#cccccc', accent_color?.light || '#f0f0f0']
      : [color?.dark || '#000000', returnMidpointColor(color.dark, accent_color.dark) || '#505050', accent_color?.dark || '#303030']
  , [currentTheme, color, accent_color]);

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.itemContainer, style]}
    >
      <View style={styles.headerContainer}>
        <View style={styles.leftHeaderContainer}>
          <View style={styles.iconContainer}>
            <Image source={iconPath} style={styles.icon} resizeMode="contain" />
          </View>
          <ThemedText type="defaultSemiBold" style={styles.companyName}>
            {name}
          </ThemedText>
        </View>
      </View>

      <View style={styles.qrContainer}>
        <View style={styles.qr}> 
          {metadata_type === 'qr' ? (
            <QRCode
              value={metadata}
              size={qrSize}
              logo={iconPath}
              logoSize={qrSize * 0.2}
              logoBackgroundColor="white"
              logoBorderRadius={50}
              logoMargin={5}
              quietZone={3}
            />
          ) : (
            <Barcode height={barcodeHeight} maxWidth={barcodeWidth} value={metadata} format="CODE128" />
          )}
        </View>
        <View style={styles.infoContainer}>
          {type === 'bank' ? (
            <>
              <ThemedText type="defaultSemiBold" style={styles.accountName} numberOfLines={1}>
                {accountName}
              </ThemedText>
              <ThemedText style={styles.accountNumber} numberOfLines={1}>
                {accountNumber}
              </ThemedText>
            </>
          ) : (
            <ThemedText style={styles.memberID} numberOfLines={2}>
              {metadata}
            </ThemedText>
          )}
        </View>
      </View>
    </LinearGradient>
  );
});

const styles = StyleSheet.create({
  itemContainer: {
    borderRadius: 16,
    paddingHorizontal: 15,  // Horizontal padding: 15
    paddingVertical: 10,   // Vertical padding: 10
    overflow: 'hidden',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,      // Vertical margin: 10
  },
  leftHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10, 
  },
  iconContainer: {
    width: 35,
    aspectRatio: 1,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  icon: {
    width: '60%',
    height: '60%',
  },
  companyName: {
    fontSize: 16,
    color: 'white',
  },
  qrContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center', 
    overflow: 'hidden',
  },
  qr: {
    padding: 10, 
    borderRadius: 16,
    backgroundColor: 'white',
    marginBottom: 10,   
  },
  infoContainer: {
    justifyContent: 'center', 
  },
  accountName: {
    fontSize: 16,
    textAlign: 'center',
    color: 'white',
  },
  accountNumber: {
    fontSize: 16,
    textAlign: 'center',
    color: 'white',
  },
  memberID: {
    fontSize: 16,
    textAlign: 'center',
    color: 'white',
    maxWidth: 250, 
  }
});