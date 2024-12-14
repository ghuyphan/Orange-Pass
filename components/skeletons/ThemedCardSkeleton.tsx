import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MotiView } from 'moti';
import { Skeleton } from 'moti/skeleton';
import { Colors } from '@/constants/Colors';
// import { useColorScheme } from '@/hooks/useColorScheme';
import { useTheme } from '@/context/ThemeContext';

export function ThemedCardSkeleton({ show = true, index = 0 }) {
  const { currentTheme: colorScheme } = useTheme();
  const colorsArray = colorScheme === 'dark'
    ? [
      '#45383A',   // Darkest brown with a red tint
      '#5A484A',   // Slightly lighter brown with red tint
      '#6F585A',   // Medium brown with red tint
      '#84686A',   // Lighter brown with red tint
      '#99787A'    // Lightest brown with red tint
    ]
    : [
      '#F0E5D8',   // Light beige
      '#E5D6C5',   // Slightly darker beige
      '#DAC7B2',   // Medium beige
      '#CFB89F',   // Darker beige
      '#C4A98C'    // Lightest beige
    ];
  const qrWidth = index % 2 === 0 ? 100 : 55;
  return (
    <MotiView
      transition={{
        type: 'timing',
        duration: 50,
      }}
      style={[styles.cardContainer]}
      animate={{ backgroundColor: colorScheme === 'dark' ? Colors.dark.cardBackground : Colors.light.cardBackground }}
    >
      <Skeleton.Group show={show}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.leftHeaderContainer}>
            <View style={styles.logoContainer}>
              <Skeleton colors={colorsArray} radius="round" height={40} width={40} />
            </View>
            <Skeleton colors={colorsArray} width={100} height={16} />
          </View>
          <Skeleton colors={colorsArray} radius="round" height={20} width={20} />
        </View>

        {/* Card Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <Skeleton colors={colorsArray} width={150} height={14} />
            <Skeleton colors={colorsArray} width={120} height={10} />
          </View>
          <View style={styles.qrContainer}>
            <Skeleton colors={colorsArray} radius={8} height={55} width={qrWidth} />
          </View>
        </View>
      </Skeleton.Group>
    </MotiView>
  );
}
const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    aspectRatio: 1.6,
    width: '100%', // This ensures the card takes full width of its container
    alignSelf: 'stretch', // Helps maintain full width
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
    gap: 10,
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',

  },
  footerLeft: {
    flexDirection: 'column',
    gap: 5,
  },
  cardType: {
    marginTop: 5,
  },
  qrContainer: {
    borderRadius: 8,
  },
});