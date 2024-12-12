import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MotiView } from 'moti';
import { Skeleton } from 'moti/skeleton';
// import { useColorScheme } from '@/hooks/useColorScheme';
import { useTheme } from '@/context/ThemeContext';

export function ThemedBankSkeleton({ show = true }) {
  // const colorScheme = useColorScheme();
  const { currentTheme: colorScheme } = useTheme();
  const colorsArray = colorScheme === 'dark'
    ? ['#604D45', '#504038', '#42332D', '#352722', '#2A1C18'] // Increased color variation
    : ['#E3D8CD', '#E0D0C3', '#DBCABA', '#D8C3B1', '#D5BCAB']; 
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
            <Skeleton colors={colorsArray} width={100} height={40} radius={15} />
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
