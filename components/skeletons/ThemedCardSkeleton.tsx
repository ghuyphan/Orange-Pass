import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MotiView } from 'moti';
import { Skeleton } from 'moti/skeleton';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function ThemedCardSkeleton({ show = true, index = 0}) {
  const colorScheme = useColorScheme();
  const colorsArray = colorScheme === 'dark'
    ? ['#6A5A58', '#4B4B4B', '#6A5A58', '#4B4B4B', '#6A5A58'] // Reversed dark mode colors
    : ['#C3997D', '#D4A78B', '#EAD2BB', '#D4A78B', '#EAD2BB'];


    const qrWidth = index % 2 === 0 ? 120 : 70;

  return (
    <MotiView
      transition={{
        type: 'timing',
      }}
      style={[styles.container, styles.padded]}
      animate={{ backgroundColor: colorScheme === 'dark' ? Colors.dark.cardBackground : Colors.light.cardBackground }}
    >
      <Skeleton.Group show={show}>
        <View style={styles.leftHeaderContainer}>
          <Skeleton colors={colorsArray} radius="round" height={45} width={45} />
          <View style={styles.labelContainer}>
            <Skeleton colors={colorsArray} width={100} height={16} />
            <Skeleton colors={colorsArray} width={150} height={14} />
          </View>
        </View>

        <View style={styles.qrContainer}>
          <Skeleton colors={colorsArray} radius={10} height={70} width={qrWidth} />
        </View>

        <View style={styles.footerContainer}>
          <Skeleton colors={colorsArray} width={100} height={15} />
        </View>
      </Skeleton.Group>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    marginBottom: 20,
    overflow: 'hidden',
  },
  padded: {
    padding: 15,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 15,
  },
  leftHeaderContainer: {
    marginLeft: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelContainer: {
    flexDirection: 'column',
    marginLeft: 10,
    gap: 10,
  },
  qrContainer: {
    alignItems: 'flex-end',
    marginVertical: 20,
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
});
