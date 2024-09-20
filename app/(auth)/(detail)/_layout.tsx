import { Stack, useSegments } from 'expo-router';
import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { useRouter } from 'expo-router';

export default function DetailLayout() {
  const segments = useSegments().toString();

  const showHeader = segments.includes('empty') || segments.includes('forgot-password');

  const onNavigateBack = useRouter().back;

  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'flip',
          animationTypeForReplace: 'pop',
        }}
      >
        <Stack.Screen options={{ presentation: 'modal' }} name="detail" />
        <Stack.Screen name="permission" />
      </Stack>
    </View>
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
    top: 20,
    right: 15,
  },
});