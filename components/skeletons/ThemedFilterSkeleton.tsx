import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MotiView } from 'moti';
import { Skeleton } from 'moti/skeleton';
// import { useColorScheme } from '@/hooks/useColorScheme';
import { useTheme } from '@/context/ThemeContext';

export function ThemedFilterSkeleton({ show = true }) {
  // const colorScheme = useColorScheme();
  const { currentTheme: colorScheme } = useTheme();
  const colorsArray = colorScheme === 'dark'
  ? ['#4E3B32', '#49362D', '#443128', '#3F2C23', '#3A271E'] 
  : ['#EADFD7', '#E8E0CF', '#E5D1C7', '#E2C2BD', '#DFB3B3'];
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
            <Skeleton colors={colorsArray} width={100} height={30} radius={50} />
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
    gap: 10,
  },
  filterButton: {
    // paddingVertical: 5,
    // paddingHorizontal: 15,
    borderRadius: 5,
  },
});
