import { ThemedButton } from '@/components/buttons/ThemedButton';
import { Stack, useSegments } from 'expo-router';
import 'react-native-reanimated';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';
import { useMemo } from 'react';
import { ThemedView } from '@/components/ThemedView';
export default function AuthLayout() {
  const segments = useSegments() as string[];
  const router = useRouter();

  // Determine if the current screen is either 'register' or 'forgot-password'
  const showHeader = useMemo(() => segments.includes('register') || segments.includes('forgot-password'), [segments]);
  return (
    <ThemedView style={styles.container}>
      <View style={styles.screenContainer}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'ios'
          }}
        >
          <Stack.Screen name="login"/>
          <Stack.Screen name="register" />
          <Stack.Screen name="forgot-password" />
        </Stack>
      </View>
      {showHeader && (
        <View style={styles.headerContainer}>
          <ThemedButton
            onPress={router.back}
            iconName="chevron-back"
          />
        </View>
      )}
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