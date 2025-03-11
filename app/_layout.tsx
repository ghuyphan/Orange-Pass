import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, UIManager, Platform, AppState } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';

// Import core services and providers
import { store } from '@/store';
import { createTable } from '@/services/localDB/userDB';
import { createQrTable } from '@/services/localDB/qrDB';
import { checkInitialAuth } from '@/services/auth';
import { checkOfflineStatus } from '@/services/network';
import { storage } from '@/utils/storage';
import * as SecureStore from 'expo-secure-store';

// Import context providers
import { LocaleProvider } from '@/context/LocaleContext';
import { ThemeProvider } from '@/context/ThemeContext';

// Import components
import { ThemedView } from '@/components/ThemedView';
import 'react-native-get-random-values';

// Import cleanup function for ResponsiveManager
import { cleanupResponsiveManager } from '@/utils/responsive';

// Prevent auto-hide of splash screen
SplashScreen.preventAutoHideAsync();

// Type for app initialization state
interface AppInitState {
  isAppReady: boolean;
  isAuthenticated: boolean | null;
  hasSeenOnboarding: boolean | null;
  hasSavedCredentials: boolean | null; // New state to track saved credentials
}

export default function RootLayout() {
  // Font loading
  const [fontsLoaded, fontError] = useFonts({
    'HelveticaNeue-Bold': require('../assets/fonts/HelveticaNeueBold.ttf'),
    'OpenSans-Regular': require('../assets/fonts/OpenSans-VariableFont_wdth,wght.ttf'),
    'OpenSans-Italic': require('../assets/fonts/OpenSans-Italic-VariableFont_wdth,wght.ttf'),
    'Roboto-Black': require('../assets/fonts/Roboto-Black.ttf'),
    'Roboto-BlackItalic': require('../assets/fonts/Roboto-BlackItalic.ttf'),
    'Roboto-Bold': require('../assets/fonts/Roboto-Bold.ttf'),
    'Roboto-BoldItalic': require('../assets/fonts/Roboto-BoldItalic.ttf'),
    'Roboto-Italic': require('../assets/fonts/Roboto-Italic.ttf'),
    'Roboto-Light': require('../assets/fonts/Roboto-Light.ttf'),
    'Roboto-LightItalic': require('../assets/fonts/Roboto-LightItalic.ttf'),
    'Roboto-Medium': require('../assets/fonts/Roboto-Medium.ttf'),
    'Roboto-MediumItalic': require('../assets/fonts/Roboto-MediumItalic.ttf'),
    'Roboto-Regular': require('../assets/fonts/Roboto-Regular.ttf'),
    'Roboto-Thin': require('../assets/fonts/Roboto-Thin.ttf'),
    'Roboto-ThinItalic': require('../assets/fonts/Roboto-ThinItalic.ttf'),
  });

  // App initialization state
  const [appState, setAppState] = useState<AppInitState>({
    isAppReady: false,
    isAuthenticated: null,
    hasSeenOnboarding: null,
    hasSavedCredentials: null,
  });

  const router = useRouter();

  // Enable layout animation on Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  // Callback to hide splash screen when app is ready
  const onLayoutRootView = useCallback(async () => {
    if (appState.isAppReady) {
      try {
        await SplashScreen.hideAsync();
      } catch (error) {
        console.error('Failed to hide splash screen', error);
      }
    }
  }, [appState.isAppReady]);

  // Check if user has saved credentials
  const checkSavedCredentials = async () => {
    try {
      const [savedEmail, rememberMe] = await Promise.all([
        SecureStore.getItemAsync('savedEmail'),
        SecureStore.getItemAsync('rememberMe')
      ]);
      
      return Boolean(savedEmail && rememberMe === 'true');
    } catch (error) {
      console.error('Error checking saved credentials:', error);
      return false;
    }
  };

  // App initialization effect
  useEffect(() => {
    const prepareApp = async () => {
      try {
        // Create local database tables
        await createTable();
        await createQrTable();

        // Check onboarding status
        const onboardingStatus = storage.getBoolean('hasSeenOnboarding') ?? false;

        // Determine authentication status
        const authStatus = onboardingStatus
          ? await checkInitialAuth().catch(() => false)
          : false;

        // Check if user has saved credentials
        const hasSavedCreds = await checkSavedCredentials();

        // Update app state
        setAppState({
          isAppReady: fontsLoaded && !fontError,
          isAuthenticated: authStatus,
          hasSeenOnboarding: onboardingStatus,
          hasSavedCredentials: hasSavedCreds,
        });
      } catch (error) {
        console.error("App initialization error:", error);

        // Fallback state in case of initialization failure
        setAppState(prev => ({
          ...prev,
          isAppReady: true,
          isAuthenticated: false,
          hasSeenOnboarding: false,
          hasSavedCredentials: false,
        }));
      }
    };

    // Setup for AppState change handling
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'inactive' || nextAppState === 'background') {
        cleanupResponsiveManager();
      }
    };

    // Run preparation and set up offline status check
    prepareApp();
    const unsubscribe = checkOfflineStatus();
    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup subscriptions
    return () => {
      unsubscribe();
      appStateSub.remove(); // Clean up AppState listener
    };
  }, [fontsLoaded, fontError]);

  // Navigation effect based on app state
  useEffect(() => {
    const { isAppReady, hasSeenOnboarding, isAuthenticated, hasSavedCredentials } = appState;

    if (isAppReady &&
        hasSeenOnboarding !== null &&
        isAuthenticated !== null &&
        hasSavedCredentials !== null) {
      try {
        if (!hasSeenOnboarding) {
          router.replace('/onboard');
        } else if (isAuthenticated) {
          router.replace('/home');
        } else if (hasSavedCredentials) {
          // Go to quick login if user has saved credentials but isn't authenticated
          router.replace('/quick-login');
        } else {
          // Regular login if no saved credentials
          router.replace('/login');
        }
      } catch (navigationError) {
        console.error('Navigation error:', navigationError);
      }
    }
  }, [appState, router]);

  // Show loading state while app is initializing
  if (!appState.isAppReady ||
      appState.isAuthenticated === null ||
      appState.hasSeenOnboarding === null ||
      appState.hasSavedCredentials === null) {
    return null; // Or a loading indicator
  }

  return (
    <ThemeProvider>
      <Provider store={store}>
        <GestureHandlerRootView style={styles.container}>
          <PaperProvider>
            <LocaleProvider>
              <ThemedView
                style={styles.root}
                onLayout={onLayoutRootView}
              >
                <Stack
                  screenOptions={{
                    headerShown: false,
                    animation: 'ios',
                  }}
                >
                  <Stack.Screen name="(public)" />
                  <Stack.Screen
                    name="(auth)"
                    options={{ animation: 'none' }}
                  />
                  <Stack.Screen name="+not-found" />
                  <Stack.Screen name="onboard" />
                  <Stack.Screen name="quickLogin" />
                </Stack>
              </ThemedView>
            </LocaleProvider>
          </PaperProvider>
        </GestureHandlerRootView>
      </Provider>
    </ThemeProvider>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  root: {
    flex: 1,
  },
});