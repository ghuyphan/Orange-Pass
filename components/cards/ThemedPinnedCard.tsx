import React, { useMemo } from 'react';
import { Image, StyleSheet, View, Platform } from 'react-native';
import { ThemedText } from '../ThemedText'; // Assuming this is your custom text component
import QRCode from 'react-native-qrcode-svg';
import Barcode from 'react-native-barcode-svg';
import { getIconPath } from '@/utils/returnIcon';
import { returnItemData } from '@/utils/returnItemData';
import { returnMidpointColors } from '@/utils/returnMidpointColor';
import { LinearGradient } from 'expo-linear-gradient';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';

// --- Constants for default colors ---
const DEFAULT_GRADIENT_START = '#FAF3E7';
const DEFAULT_GRADIENT_END = '#D6C4AF';

// --- Prop Types ---
export type ThemedPinnedCardProps = {
  code: string;
  type: 'bank' | 'store' | 'ewallet';
  metadata: string;
  metadata_type: 'qr' | 'barcode';
  accountName?: string;
  accountNumber?: string;
  style?: object;
  onAccountPress?: () => void;
  onAccountNumberPress?: () => void;
  enableGlassmorphism?: boolean; // New prop to toggle glassmorphism
};

export const ThemedPinnedCard = ({
  code,
  type,
  metadata,
  metadata_type,
  accountName,
  accountNumber,
  style,
  onAccountPress,
  onAccountNumberPress,
  enableGlassmorphism = true, // Default to true for the glass effect
}: ThemedPinnedCardProps): JSX.Element => {
  // --- Memoized Calculations ---
  const qrSize = useMemo(() => getResponsiveWidth(42), []);
  const barcodeHeight = useMemo(() => getResponsiveHeight(12), []);
  const barcodeWidth = useMemo(() => getResponsiveWidth(70), []);

  const itemData = useMemo(() => returnItemData(code), [code]);
  const { name, color, accent_color } = itemData;
  const iconPath = useMemo(() => getIconPath(code), [code]);

  // --- Color & Gradient Logic ---

  // Original, opaque gradient colors
  const gradientColors = useMemo(
    () =>
      returnMidpointColors(
        color?.light || DEFAULT_GRADIENT_START,
        accent_color?.light || DEFAULT_GRADIENT_END,
        6
      ) || [DEFAULT_GRADIENT_START, DEFAULT_GRADIENT_END],
    [color, accent_color]
  );

  // Transparent gradient colors for the "frosted glass" layer
  const glassGradientColors = useMemo(() => {
    if (!enableGlassmorphism) return [];
    return [
      'rgba(255, 255, 255, 0.25)',
      'rgba(255, 255, 255, 0.15)',
      'rgba(255, 255, 255, 0.1)',
      'rgba(255, 255, 255, 0.08)',
    ];
  }, [enableGlassmorphism]);

  // Background gradient used *behind* the glass layers
  const backgroundGradient = useMemo(() => {
    if (!enableGlassmorphism) return null;
    return gradientColors;
  }, [enableGlassmorphism, gradientColors]);

  // --- Main Render ---
  return (
    <View style={[styles.outerContainer, enableGlassmorphism && styles.glassOuterContainer]}>
      <View style={styles.cardWrapper}>
        {/* Layer 1: Vivid background (only for glassmorphism) */}
        {enableGlassmorphism && backgroundGradient && (
          <LinearGradient
            colors={backgroundGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.backgroundGradient}
          />
        )}
        
        {/* Layer 2 & 3: Subtle inner glass layers for depth */}
        {enableGlassmorphism && (
          <>
            <View style={styles.glassLayer1} />
            <View style={styles.glassLayer2} />
          </>
        )}

        {/* Layer 4: Main content with "frosted glass" gradient */}
        <LinearGradient
          colors={enableGlassmorphism ? glassGradientColors : gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.container, enableGlassmorphism && styles.glassContentContainer, style]}
        >
          {/* --- Card Header --- */}
          <View style={styles.headerContainer}>
            <View style={[styles.logoContainer, enableGlassmorphism && styles.glassLogoContainer]}>
              <Image source={iconPath} style={styles.logo} resizeMode="contain" />
            </View>
            <ThemedText style={[styles.companyName, enableGlassmorphism && styles.glassText]}>{name}</ThemedText>
          </View>

          {/* --- Card Body (QR/Barcode) --- */}
          <View style={styles.codeContainer}>
            <View
              style={[
                styles.codeWrapper,
                metadata_type === 'barcode' && styles.barcodePadding,
                enableGlassmorphism && styles.glassCodeWrapper,
              ]}
            >
              {metadata_type === 'qr' ? (
                <QRCode value={metadata} size={qrSize} quietZone={getResponsiveWidth(0.8)} />
              ) : (
                <Barcode height={barcodeHeight} maxWidth={barcodeWidth} value={metadata} format="CODE128" />
              )}
            </View>

            {type === 'bank' && (
              <View style={[styles.brandContainer, enableGlassmorphism && styles.glassBrandContainer]}>
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
            )}

            {/* --- Card Footer (Account Info) --- */}
            <View style={styles.infoContainer}>
              {(type === 'bank' || type === "ewallet") && (
                <TouchableWithoutFeedback onPress={onAccountPress}>
                  <ThemedText type="defaultSemiBold" style={[styles.accountName, enableGlassmorphism && styles.glassText]} numberOfLines={1}>
                    {accountName}
                  </ThemedText>
                </TouchableWithoutFeedback>
              )}
              <TouchableWithoutFeedback onPress={onAccountNumberPress}>
                <ThemedText style={[styles.accountNumber, enableGlassmorphism && styles.glassSubText]} numberOfLines={1}>
                  {accountNumber ? accountNumber : metadata}
                </ThemedText>
              </TouchableWithoutFeedback>
            </View>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
};

// --- Stylesheet ---
const styles = StyleSheet.create({
  // --- Containers and Layers ---
  outerContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  glassOuterContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cardWrapper: {
    position: 'relative',
    borderRadius: getResponsiveWidth(4),
    overflow: 'hidden',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0.8,
  },
  glassLayer1: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  glassLayer2: {
    position: 'absolute',
    top: 1, left: 1, right: 1, bottom: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: getResponsiveWidth(3.8),
  },
  container: {
    borderRadius: getResponsiveWidth(4),
    paddingHorizontal: getResponsiveWidth(4.8),
    paddingVertical: getResponsiveHeight(1.8),
    position: 'relative',
    zIndex: 1,
  },
  glassContentContainer: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
    borderLeftColor: 'rgba(255, 255, 255, 0.3)',
  },

  // --- Header ---
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
  glassLogoContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
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
  
  // --- Body ---
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
  glassCodeWrapper: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: Platform.OS === 'android' ? 3 : 0,
  },
  barcodePadding: {
    paddingHorizontal: getResponsiveWidth(3.6),
    paddingVertical: getResponsiveHeight(1.8),
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: getResponsiveWidth(2.5),
    padding: getResponsiveWidth(1.2),
    marginBottom: getResponsiveHeight(1.8),
  },
  glassBrandContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  vietQRIcon: {
    width: '23%',
    height: getResponsiveHeight(3.6),
  },
  divider: {
    width: getResponsiveWidth(0.35),
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: getResponsiveWidth(3.6),
  },
  napasIcon: {
    width: '20%',
    height: getResponsiveHeight(2.4),
    marginTop: getResponsiveHeight(0.6),
    marginRight: getResponsiveWidth(1.6),
  },

  // --- Footer ---
  infoContainer: {
    alignItems: 'center',
  },
  accountName: {
    color: 'white',
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
  },
  accountNumber: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: getResponsiveFontSize(15),
    maxWidth: getResponsiveWidth(65),
  },

  // --- Glassmorphism Text Styles ---
  glassText: {
    color: "rgba(255, 255, 255, 0.95)",
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  glassSubText: {
    color: "rgba(255,255,255,0.8)",
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});

export default ThemedPinnedCard;