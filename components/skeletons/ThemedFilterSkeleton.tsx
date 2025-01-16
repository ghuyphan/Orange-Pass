import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { Skeleton } from 'moti/skeleton';
import { useTheme } from '@/context/ThemeContext';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';
import { Colors } from '@/constants/Colors';

interface ThemedFilterSkeletonProps {
  show?: boolean;
}

export function ThemedFilterSkeleton({ show = true }: ThemedFilterSkeletonProps) {
  const { currentTheme: colorScheme } = useTheme();

  const skeletonColors = useMemo(() => {
    return colorScheme === 'dark'
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
  }, [colorScheme]);

  return (
    <MotiView
      transition={{
        type: 'timing',
        duration: 50,
      }}
      style={styles.filterContainer}
    >
      <Skeleton.Group show={show}>
        {Array.from({ length: 4 }).map((_, index) => (
          <View key={index} style={styles.filterButton}>
            <Skeleton
              colors={skeletonColors}
              width={getResponsiveWidth(20.5)}
              height={getResponsiveHeight(5.7)}
              radius={getResponsiveWidth(4)}
            />
          </View>
        ))}
      </Skeleton.Group>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: getResponsiveWidth(2),
    justifyContent: 'space-between',
  },
  filterButton: {
    borderRadius: getResponsiveWidth(4)
  },
});