import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MotiView } from 'moti';
import { Skeleton } from 'moti/skeleton';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';

export function ThemedCardSkeleton({ show = true, index = 0 }) {
  const { currentTheme: colorScheme } = useTheme();
  
  const colorsArray = colorScheme === 'dark'
    ? [
        '#45383A', // Darkest brown with a red tint
        '#5A484A', // Slightly lighter brown with red tint
        '#6F585A', // Medium brown with red tint
        '#84686A', // Lighter brown with red tint
        '#99787A'  // Lightest brown with red tint
      ]
    : [
        '#F0E5D8', // Light beige
        '#E5D6C5', // Slightly darker beige
        '#DAC7B2', // Medium beige
        '#CFB89F', // Darker beige
        '#C4A98C'  // Lightest beige
      ];

  // Alternate between QR and barcode dimensions based on index
  const isQRCode = index % 2 === 0;
  const codeWidth = isQRCode ? getResponsiveWidth(16.8) : getResponsiveWidth(30);
  const codeHeight = isQRCode ? getResponsiveWidth(16.8) : getResponsiveHeight(8.4);

  return (
    <View style={[
      styles.outerContainer,
      { 
        marginBottom: getResponsiveHeight(1.8) 
      }
    ]}>
      <MotiView
        transition={{
          type: 'timing',
          duration: 50,
        }}
        style={[styles.cardContainer]}
        animate={{ 
          backgroundColor: colorScheme === 'dark' 
            ? Colors.dark.cardBackground 
            : Colors.light.cardBackground 
        }}
      >
        <Skeleton.Group show={show}>
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={styles.leftHeaderContainer}>
              <View style={styles.logoContainer}>
                <Skeleton 
                  colors={colorsArray} 
                  radius="round" 
                  height={getResponsiveWidth(9.6)} 
                  width={getResponsiveWidth(9.6)} 
                />
              </View>
              <Skeleton 
                colors={colorsArray} 
                width={getResponsiveWidth(36)} 
                height={getResponsiveFontSize(16)} 
              />
            </View>
            <Skeleton 
              colors={colorsArray} 
              radius="round" 
              height={getResponsiveFontSize(20)} 
              width={getResponsiveFontSize(20)} 
            />
          </View>

          {/* Card Footer */}
          <View style={styles.cardFooter}>
            <View style={styles.footerLeft}>
              <Skeleton 
                colors={colorsArray} 
                width={getResponsiveWidth(45)} 
                height={getResponsiveFontSize(16)} 
              />
              <View style={styles.cardTypeContainer}>
                <Skeleton 
                  colors={colorsArray} 
                  width={getResponsiveWidth(28.8)} 
                  height={getResponsiveFontSize(12)} 
                />
              </View>
            </View>
            <View style={styles.qrContainer}>
              <Skeleton 
                colors={colorsArray} 
                radius={getResponsiveWidth(2)} 
                height={codeHeight}
                width={codeWidth}
              />
            </View>
          </View>
        </Skeleton.Group>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    // Matching the original card's outer container
  },
  cardContainer: {
    borderRadius: getResponsiveWidth(4),
    paddingVertical: getResponsiveHeight(1.8),
    paddingHorizontal: getResponsiveWidth(4.8),
    aspectRatio: 1.65,
    justifyContent: 'space-between',
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
    width: getResponsiveWidth(9.6),
    height: getResponsiveWidth(9.6),
    borderRadius: getResponsiveWidth(6),
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    pointerEvents: 'none',
  },
  footerLeft: {
    flexDirection: 'column',
  },
  cardTypeContainer: {
    marginTop: getResponsiveHeight(0.6),
  },
  qrContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: getResponsiveWidth(2),
    padding: getResponsiveWidth(2),
  },
  dragHandle: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'none',
  },
});