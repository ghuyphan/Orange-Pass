import { Stack, useSegments } from 'expo-router';
import React from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View, Text } from 'react-native';
import { ThemedView } from '@/components/ThemedView';

export default function HomeLayout() {
  const segments = useSegments();
  const router = useRouter();

  const disableAnimation = segments.length === 1 && segments[0] === 'home';

  return (
    <ThemedView style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false,
          headerLeft: () => <Text>hello</Text>,
          // animation: 'default',
          animation: 'ios',
          animationTypeForReplace: 'push',
        }}
      >
        <Stack.Screen name="home"/>
        <Stack.Screen name="explore" />
        <Stack.Screen name="(add)" />
        <Stack.Screen name="(detail)" />
        <Stack.Screen name="(scan)"/>
        <Stack.Screen name="empty" />
      </Stack>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    position: 'absolute',
    top: 50,
    right: 15,
    zIndex: 10,
  },
});