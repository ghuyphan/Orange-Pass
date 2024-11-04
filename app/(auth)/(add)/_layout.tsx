import { Stack, useSegments } from 'expo-router';
import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { useRouter } from 'expo-router';

export default function AddLayout() {
  const segments = useSegments();

  const showHeader = segments.includes('empty') || segments.includes('forgot-password');

  const onNavigateBack = useRouter().back;

  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'ios'
        }}
      >
        <Stack.Screen options={{ presentation: 'modal' }} name="add-new" />
      </Stack>
      {/* {showHeader && ( */}
      <View style={[styles.headerContainer, Platform.OS == 'android' ? { top: 60 } : { top: 20 }]}>
        <ThemedButton
          onPress={onNavigateBack}
           iconName="chevron-back"
        />
      </View>
      {/* )} */}
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
    left: 15,
  },
});