import { ThemedButton } from '@/components/buttons/ThemedButton';
import { Stack, useSegments } from 'expo-router';
import 'react-native-reanimated';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useMemo, useEffect, useState } from 'react';
import { ThemedView } from '@/components/ThemedView';
import { getResponsiveHeight, getResponsiveWidth } from '@/utils/responsive';
import { storage } from '@/utils/storage';
import { MMKV_KEYS } from '@/services/auth/login';

export default function AuthLayout() {
  const segments = useSegments() as string[];
  const router = useRouter();
  const [hasQuickLoginAccounts, setHasQuickLoginAccounts] = useState(false);

  // Check if any accounts have quick login enabled
  useEffect(() => {
    const checkQuickLoginAccounts = () => {
      try {
        const prefsString = storage.getString(MMKV_KEYS.QUICK_LOGIN_PREFERENCES);
        if (!prefsString) {
          setHasQuickLoginAccounts(false);
          return;
        }

        const prefs = JSON.parse(prefsString);
        const hasEnabledAccounts = Object.values(prefs).some(value => value === true);
        setHasQuickLoginAccounts(hasEnabledAccounts);
      } catch (error) {
        console.error('Error checking quick login accounts:', error);
        setHasQuickLoginAccounts(false);
      }
    };

    checkQuickLoginAccounts();
  }, []);

  // Determine if the current screen is 'register', 'forgot-password', or 'login' with quick login accounts
  const showHeader = useMemo(() => {
    return segments.includes('register') ||
      segments.includes('forgot-password') ||
      (segments.includes('login') && hasQuickLoginAccounts);
  }, [segments, hasQuickLoginAccounts]);

  // Determine where the back button should navigate
  const handleBackPress = () => {
    // Otherwise use the default back behavior
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.screenContainer}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'ios'
          }}
        >
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="quick-login"/>
        </Stack>
      </View>
      {showHeader && (
        <View style={styles.headerContainer}>
          <ThemedButton
            onPress={handleBackPress}
            iconName="chevron-left"
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
    top: getResponsiveHeight(10),
    left: getResponsiveWidth(3.6),
    // zIndex: 10,
  },
});
