import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MotiView } from 'moti';
import { Skeleton } from 'moti/skeleton';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function ThemedFilterSkeleton({ show = true }) {
  const colorScheme = useColorScheme();
  const colorsArray = colorScheme === 'dark'
    ? ['#8E7F7C', '#6B615E', '#8E7F7C', '#6B615E', '#8E7F7C'] // Lighter warm tones for dark mode
    : ['#E3C5A8', '#D5AF92', '#E3C5A8', '#D5AF92', '#E3C5A8']; // Warmer shades for light mode to contrast the light background

  return (
    <MotiView
      transition={{
        type: 'timing',
        duration: 50, // Reduced duration for faster animation
      }}
      style={styles.filterContainer}
    >
      <Skeleton.Group show={show}>
        {Array.from({ length: 4 }).map((_, index) => (
          <View key={index} style={styles.filterButton}>
            <Skeleton colors={colorsArray} width={95} height={35} radius={10} />
          </View>
        ))}
      </Skeleton.Group>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingLeft: 15,
    gap: 10,
  },
  filterButton: {
    // paddingVertical: 5,
    // paddingHorizontal: 15,
    borderRadius: 10,
  },
});
