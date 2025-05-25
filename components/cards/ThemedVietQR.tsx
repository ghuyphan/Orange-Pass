import { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { ThemedText } from '../ThemedText';
import QRCode from 'react-native-qrcode-svg';
import { getIconPath } from '@/utils/returnIcon';
import { returnItemData } from '@/utils/returnItemData'; // Your data manager
import { returnMidpointColors } from '@/utils/returnMidpointColor';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getResponsiveFontSize,
  getResponsiveWidth,
  getResponsiveHeight,
} from '@/utils/responsive';

// A simple fallback for dark mode color generation if not imported
const getSimpleDarkModeColor = (lightColor: string): string => {
  if (lightColor === '#FAF3E7') return '#A09480';
  if (lightColor === '#D6C4AF') return '#8E8170';
  return '#333333';
};

export type ThemedVietQRProps = {
  code: string;
  type: 'bank' | 'store' | 'ewallet' | 'vietqr';
  metadata: string;
  accountName?: string;
  accountNumber?: string;
  style?: object;
  amount?: string;
};

export const ThemedVietQRCard = ({
  code,
  type,
  metadata,
  accountName,
  accountNumber,
  style,
  amount,
}: ThemedVietQRProps): JSX.Element => {
  const qrSize = useMemo(() => getResponsiveWidth(42), []);
  const itemData = useMemo(() => returnItemData(code, type), [code, type]);

  const displayName = itemData?.name || 'Unknown Service';
  const displayColor = itemData?.color || {
    light: '#FAF3E7',
    dark: getSimpleDarkModeColor('#FAF3E7'),
  };
  const displayAccentColor = itemData?.accent_color || {
    light: '#D6C4AF',
    dark: getSimpleDarkModeColor('#D6C4AF'),
  };
  const iconPath = useMemo(() => getIconPath(code), [code]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
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
          overflow: 'hidden',
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
          padding: getResponsiveWidth(2.5),
          marginBottom: getResponsiveHeight(1.8),
          alignItems: 'center',
          justifyContent: 'center',
        },
        additionalInfoContainer: {
          width: '100%',
        },
        brandContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'center',
          backgroundColor: 'rgba(255,255,255,0.4)',
          borderRadius: getResponsiveWidth(2.5),
          paddingVertical: getResponsiveHeight(0.6),
          paddingHorizontal: getResponsiveWidth(2.4),
          marginBottom: getResponsiveHeight(1.8),
        },
        vietQRIcon: {
          width: getResponsiveWidth(18),
          height: getResponsiveHeight(3.6),
        },
        divider: {
          width: getResponsiveWidth(0.35),
          height: '60%',
          backgroundColor: '#535f78',
          marginHorizontal: getResponsiveWidth(2.5),
        },
        napasIcon: {
          width: getResponsiveWidth(15),
          height: getResponsiveHeight(2.4),
        },
        infoContainer: {
          alignItems: 'center',
          justifyContent: 'center',
        },
        accountName: {
          color: 'white',
          fontSize: getResponsiveFontSize(19),
          fontWeight: '600',
          marginBottom: getResponsiveHeight(0.3),
        },
        accountNumber: {
          color: 'rgba(255,255,255,0.7)',
          fontSize: getResponsiveFontSize(15),
          maxWidth: getResponsiveWidth(60),
        },
        amountTextContainer: { // Renamed for clarity, this is the pill background
          backgroundColor: 'rgba(255,255,255,0.4)', // Darker, more opaque background
          paddingVertical: getResponsiveHeight(0.8),
          paddingHorizontal: getResponsiveWidth(4),
          borderRadius: getResponsiveWidth(2.5),
          alignSelf: 'center', // Center the pill itself
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: getResponsiveHeight(1.5), // Space below the amount pill
          maxWidth: '80%', // Prevent pill from being too wide
        },
        amountText: {
          color: 'white',
          fontSize: getResponsiveFontSize(15), // Increased font size
          fontWeight: 'bold', // Bolder text
          textAlign: 'center', // Ensure text is centered within the pill
        },
      }),
    [],
  );

  return (
    <LinearGradient
      colors={
        returnMidpointColors(
          displayColor.light,
          displayAccentColor.light,
          6,
        ) || [displayColor.light, displayAccentColor.light]
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, style]}
    >
      <View style={styles.headerContainer}>
        <View style={styles.logoContainer}>
          <Image source={iconPath} style={styles.logo} resizeMode="contain" />
        </View>
        <ThemedText style={styles.companyName} numberOfLines={1}>
          {displayName}
        </ThemedText>
      </View>

      <View style={styles.codeContainer}>
        <View style={styles.codeWrapper}>
          <QRCode
            value={metadata}
            size={qrSize}
            quietZone={getResponsiveWidth(0.8)}
          />
        </View>
        <View style={styles.additionalInfoContainer}>
          <View style={styles.brandContainer}>
            <Image
              style={styles.vietQRIcon}
              source={require('@/assets/images/vietqr.png')}
              resizeMode="contain"
            />
            <View style={styles.divider} />
            <Image
              style={styles.napasIcon}
              source={require('@/assets/images/napas.png')}
              resizeMode="contain"
            />
          </View>

          {amount && (
            <View style={styles.amountTextContainer}>
              <ThemedText style={styles.amountText} numberOfLines={1}>
                {amount} VND
              </ThemedText>
            </View>
          )}

          <View style={styles.infoContainer}>
            {accountName && (
              <ThemedText
                type="defaultSemiBold"
                style={styles.accountName}
                numberOfLines={1}
              >
                {accountName}
              </ThemedText>
            )}
            {/* <ThemedText style={styles.accountNumber} numberOfLines={1}>
              {accountNumber ? accountNumber : metadata}
            </ThemedText> */}
          </View>
        </View>
      </View>
    </LinearGradient>
  );
};

export default ThemedVietQRCard;
