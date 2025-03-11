import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MotiView } from 'moti';
import { Skeleton } from 'moti/skeleton';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';

export function ThemedCardSkeleton({ show = true, index = 0 }) {
  const { currentTheme } = useTheme();

  // Simplified color arrays
  const darkColors = ['#45383A', '#5A484A', '#6F585A', '#84686A', '#99787A'];
  const lightColors = ['#F0E5D8', '#E5D6C5', '#DAC7B2', '#CFB89F', '#C4A98C'];
  const colorsArray = currentTheme === 'dark' ? darkColors : lightColors;

  // Alternate between QR and barcode dimensions based on index, using a ternary for conciseness
  const isQRCode = index % 2 === 0;
  const codeWidth = isQRCode ? getResponsiveWidth(16.8) : getResponsiveWidth(30);
  const codeHeight = isQRCode ? getResponsiveWidth(16.8) : getResponsiveHeight(8.4);

  // Pre-calculate common style values to avoid repetition
  const logoSize = getResponsiveWidth(9.6);
  const headerTextWidth = getResponsiveWidth(36);
  const headerTextHeight = getResponsiveFontSize(16);
  const iconSize = getResponsiveFontSize(20);
  const footerTextWidth = getResponsiveWidth(40);
  const footerTextHeight = getResponsiveFontSize(16);
  const cardTypeWidth = getResponsiveWidth(28.8);
  const cardTypeHeight = getResponsiveFontSize(12);
  const codeRadius = getResponsiveWidth(2);
    const cardBackgroundColor = currentTheme === 'dark' ? Colors.dark.cardBackground : Colors.light.cardBackground;


  return (
    <View style={[styles.outerContainer, { marginBottom: getResponsiveHeight(1.8) }]}>
      <MotiView
        transition={{ type: 'timing', duration: 50 }}
        style={[styles.cardContainer, {backgroundColor: cardBackgroundColor}]} // Apply background color here
        // Removed animate prop, as it's redundant with the backgroundColor style
      >
        <Skeleton.Group show={show}>
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={styles.leftHeaderContainer}>
              <View style={styles.logoContainer}>
                <Skeleton colors={colorsArray} radius="round" height={logoSize} width={logoSize} />
              </View>
              <Skeleton colors={colorsArray} width={headerTextWidth} height={headerTextHeight} />
            </View>
            <Skeleton colors={colorsArray} radius="round" height={iconSize} width={iconSize} />
          </View>

          {/* Card Footer */}
          <View style={styles.cardFooter}>
            <View style={styles.footerLeft}>
              <Skeleton colors={colorsArray} width={footerTextWidth} height={footerTextHeight} />
              <View style={styles.cardTypeContainer}>
                <Skeleton colors={colorsArray} width={cardTypeWidth} height={cardTypeHeight} />
              </View>
            </View>
            <View style={styles.qrContainer}>
              <Skeleton colors={colorsArray} radius={codeRadius} height={codeHeight} width={codeWidth} />
            </View>
          </View>
        </Skeleton.Group>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    //  marginBottom is now handled directly in the component
  },
  cardContainer: {
    borderRadius: getResponsiveWidth(4),
    paddingVertical: getResponsiveHeight(1.8),
    paddingHorizontal: getResponsiveWidth(4.8),
    aspectRatio: 1.65,
    justifyContent: 'space-between',
      //backgroundColor is now handled directly in the component

  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveWidth(2.4),
  },
  logoContainer: {
    // Removed width, height, borderRadius as they are now defined via props
    backgroundColor: 'rgba(255,255,255,0.2)', // Consider moving this to a constant or theme
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    pointerEvents: 'none', // Consider if this is necessary, might be removable
  },
  footerLeft: {
    // flexDirection: 'column' is the default, so it's redundant
  },
  cardTypeContainer: {
    marginTop: getResponsiveHeight(0.6),
  },
  qrContainer: {
    borderRadius: getResponsiveWidth(2), //  defined via props
    padding: getResponsiveWidth(2),  // Consider if this padding is needed, or if the skeleton should fill the container
  },
  dragHandle: { // This style isn't used in the component, so it's removed
    // Removed unused style
  },
});