import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MotiView } from 'moti';
import { Skeleton } from 'moti/skeleton';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function ThemedFilterSkeleton({ show = true }) {
  const colorScheme = useColorScheme();
  const colorsArray = colorScheme === 'dark'
  ? ['#6B5A4E', '#5A3D30', '#6B5A4E', '#5A3D30', '#4F3C31']
  : ['#D3B8A3', '#DFCABB', '#D3B8A3', '#DFCABB', '#C9B4A9'];

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
            <Skeleton colors={colorsArray} width={80} height={30} radius={10} />
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
