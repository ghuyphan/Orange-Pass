import { Stack, useSegments } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { useRouter } from 'expo-router';
import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';
import { ThemedView } from '@/components/ThemedView';

export default function ScanLayout() {
  const segments = useSegments().toString();

  const showHeader = segments.includes('permission');

  const onNavigateBack = useRouter().back;

  return (
    <ThemedView style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'ios_from_right'
        }}
      >
        <Stack.Screen name="settings-guest" />
        <Stack.Screen name="theme" />
        <Stack.Screen name="language" />
      </Stack>
      {showHeader &&
        <View style={styles.headerContainer}>
          <ThemedButton
            onPress={onNavigateBack}
            iconName="chevron-left"
          />
        </View>}

    </ThemedView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
  },
  headerContainer: {
    position: 'absolute',
    top: STATUSBAR_HEIGHT + 25,
    left: 15,
    zIndex: 10,
  },
});