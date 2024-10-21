import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MotiView } from 'moti';
import { Skeleton } from 'moti/skeleton';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function ThemedFilterSkeleton({ show = true }) {
  const colorScheme = useColorScheme();
  const colorsArray = colorScheme === 'dark'
  ? ['#B29A8E', '#A88A7D', '#B29A8E', '#A88A7D', '#B29A8E'] // Shades closer to #B29A8E for dark mode
  : ['#D4B9A5', '#C9A895', '#D4B9A5', '#C9A895', '#D4B9A5']; // Lighter and warmer shades for light m

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
