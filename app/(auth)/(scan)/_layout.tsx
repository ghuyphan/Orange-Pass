import { Stack, useSegments } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { useRouter, Redirect } from 'expo-router';
import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';
import { ThemedView } from '@/components/ThemedView';
import { useCameraPermission } from 'react-native-vision-camera';
import { getResponsiveHeight } from '@/utils/responsive';

export default function ScanLayout() {
  const segments = useSegments().toString();
  const showHeader = segments.includes('permission');
  const onNavigateBack = useRouter().back;
  const { hasPermission } = useCameraPermission(); // Add permission check

  if (!hasPermission && !showHeader) {
      return (
        <ThemedView style={styles.container}>
           <Redirect href="/(auth)/(scan)/permission" />
        </ThemedView>
      )
  }

  return (
    <ThemedView style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'ios_from_right'
        }}
      >
        <Stack.Screen name="scan-main" />
        <Stack.Screen name="permission" />
      </Stack>
      {showHeader &&
        <View style={styles.headerContainer}>
          <ThemedButton
            onPress={onNavigateBack}
            iconName="chevron-left"
          />
        </View>
      }
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
    top: getResponsiveHeight(10),
    left: 15,
    zIndex: 10,
  },
});