import React, { memo, useMemo, useState, useEffect } from 'react';
import { Image, StyleSheet, View, TouchableHighlight, InteractionManager, useWindowDimensions } from 'react-native';
import { ThemedText } from '../ThemedText';
import QRCode from 'react-native-qrcode-svg';
import Barcode from 'react-native-barcode-svg';
import { useTheme } from '@/context/ThemeContext';
import { getIconPath } from '@/utils/returnIcon';
import { returnItemData } from '@/utils/returnItemData';
import { returnMidpointColor } from '@/utils/returnMidpointColor';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';

export type ThemedPinnedCardProps = {
  lightColor?: string;
  darkColor?: string;
  code: string;
  type: 'bank' | 'store' | 'ewallet';
  metadata: string;
  metadata_type: 'qr' | 'barcode';
  accountName?: string;
  accountNumber?: string;
  onItemLongPress?: () => void;
  style?: object;
};

export const ThemedPinnedCard = memo(function ThemedPinnedCard({
  lightColor,
  darkColor,
  code,
  type,
  metadata,
  metadata_type,
  accountName,
  accountNumber,
  onItemLongPress,
  style,
}: ThemedPinnedCardProps): JSX.Element {
  // const colorScheme = useColorScheme();
  const {currentTheme} = useTheme();
  // const colors = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const colors = currentTheme === 'light' ? Colors.light.text : Colors.dark.text;
  const { width } = useWindowDimensions();

  // Calculate sizes based on screen width
  const qrSize = useMemo(() => width * 0.4, [width]); // Adjust QR code size to 50% of screen width
  const barcodeHeight = useMemo(() => width * 0.25, [width]); // Adjust Barcode height to 20% of screen width
  const barcodeWidth = useMemo(() => width * 0.6, [width]); // Adjust Barcode max width to 80% of screen width

  // Memoize the result of returnItemData to avoid unnecessary computations
  const { full_name, name, color, accent_color } = useMemo(() => returnItemData(code, type), [code, type]);

  // Memoize iconPath to prevent re-computation
  const iconPath = useMemo(() => getIconPath(code), [code]);

  // State to control when to render the QR code or barcode
  const [shouldRenderCode, setShouldRenderCode] = useState(false);

  useEffect(() => {
    // Defer the rendering of the QR code/barcode to prevent blocking the UI thread
    const task = InteractionManager.runAfterInteractions(() => {
      setShouldRenderCode(true);
    });
    return () => task.cancel();
  }, []);

  // Memoize styles to avoid inline style objects causing re-renders
  // const backgroundColorStyle = useMemo(
  //   () => ({
  //     backgroundColor: currentTheme === 'light' ? color.light : color.dark,
  //   }),
  //   [currentTheme, color.light, color.dark]
  // );

  const underlayColor = useMemo(() => (currentTheme === 'light' ? color.dark : color.light), [
    currentTheme,
    color.light,
    color.dark,
  ]);

  return (
    <TouchableHighlight
      onLongPress={onItemLongPress}
      style={[styles.touchableHighlight, style]}
      underlayColor={underlayColor}
    >
      {/* <ThemedView style={[styles.itemContainer, backgroundColorStyle]}> */}
          <LinearGradient
            colors={
              currentTheme === 'light'
                ? [color?.light || '#ffffff', returnMidpointColor(color.light, accent_color.light) || '#cccccc', accent_color?.light || '#f0f0f0']
                : [color?.dark || '#000000', returnMidpointColor(color.dark, accent_color.dark) || '#505050', accent_color?.dark || '#303030']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.itemContainer}
          >
        <View style={styles.headerContainer}>
          <View style={styles.leftHeaderContainer}>
            <View style={styles.iconContainer}>
              <Image source={iconPath} style={styles.icon} resizeMode="contain" />
            </View>
            <View style={styles.labelContainer}>
              <ThemedText type="defaultSemiBold" style={styles.companyName}>
                {name}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.qrContainer}>
          {shouldRenderCode && (
            <View style={styles.qr}>
              {metadata_type === 'qr' ? (
                <QRCode
                  value={metadata}
                  size={qrSize}
                  logo={iconPath}
                  logoSize={qrSize * 0.2} // Adjust logo size relative to the QR code size
                  logoBackgroundColor="white"
                  logoBorderRadius={50}
                  logoMargin={5}
                  quietZone={3}
                />
              ) : (
                <Barcode height={barcodeHeight} maxWidth={barcodeWidth} value={metadata} format="CODE128" />
              )}
            </View>
          )}
          {type === 'bank' ? (
            <View style={[styles.infoContainer, styles.infoContainerWithMarginTop]}>
              <ThemedText type='defaultSemiBold' style={styles.accountName} numberOfLines={1}>
                {accountName}
              </ThemedText>
              <ThemedText style={styles.accountNumber} numberOfLines={1}>
                {accountNumber}
              </ThemedText>
            </View>
          ) :
            <View style={[styles.infoContainer, styles.infoContainerWithMarginTop]}>
              <ThemedText style={styles.memberID} numberOfLines={2}>
                {metadata}
              </ThemedText>
            </View>
          }
        </View>
        {/* </ThemedView> */}
      </LinearGradient>
    </TouchableHighlight>
  );
});

const styles = StyleSheet.create({
  touchableHighlight: {
    borderRadius: 15,
  },
  itemContainer: {
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    overflow: 'hidden',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  leftHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconContainer: {
    width: 40,
    aspectRatio: 1,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  labelContainer: {
    flexDirection: 'column',
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
    paddingTop: 15,
  },
  qr: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'white',
  },
  infoContainer: {
    justifyContent: 'center',
  },
  infoContainerWithMarginTop: {
    marginTop: 15,
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
    overflow: 'hidden',
  }
});
