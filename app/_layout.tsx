import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { StyleSheet, UIManager, Platform, AppState } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { ActivityIndicator } from 'react-native';

// Import core services and providers
import { store } from '@/store';
import { createTable } from '@/services/localDB/userDB';
import { createQrTable } from '@/services/localDB/qrDB';
import { checkInitialAuth, getQuickLoginStatus } from '@/services/auth';
import { checkOfflineStatus } from '@/services/network';
import { storage } from '@/utils/storage';

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
  hasQuickLoginEnabled: boolean | null;
}

// Pre-load fonts configuration
const fontAssets = {
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
};

export default function RootLayout() {
  // Font loading - memoize to prevent unnecessary re-renders
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  // App initialization state
  const [appState, setAppState] = useState<AppInitState>({
    isAppReady: false,
    isAuthenticated: null,
    hasSeenOnboarding: null,
    hasQuickLoginEnabled: null,
  });

  const router = useRouter();

  // Enable layout animation on Android - only run once
  useEffect(() => {
    if (Platform.OS === 'android') {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  // Memoized check for quick login to prevent recreating on each render
  const checkQuickLoginEnabled = useCallback(async () => {
    return Promise.resolve(getQuickLoginStatus());
  }, []);

  // Memoized handler for app state changes
  const handleAppStateChange = useCallback((nextAppState: string) => {
    if (nextAppState === 'inactive' || nextAppState === 'background') {
      cleanupResponsiveManager();
    }
  }, []);

  // Initialize database tables
  const initializeDatabase = useCallback(async () => {
    await Promise.all([createTable(), createQrTable()]);
  }, []);

  // Check onboarding status
  const checkOnboardingStatus = useCallback(async () => {
    return storage.getBoolean('hasSeenOnboarding') ?? false;
  }, []);

  // Check authentication status
  const checkAuthStatus = useCallback(async (onboardingStatus: boolean) => {
    return onboardingStatus ? checkInitialAuth().catch(() => false) : Promise.resolve(false);
  }, []);

  // Prepare app initialization
  const prepareApp = useCallback(async () => {
    try {
      // Run database and auth checks in parallel
      const [onboardingStatus, authStatus, quickLoginEnabled] = await Promise.all([
        checkOnboardingStatus(),
        checkAuthStatus(await checkOnboardingStatus()),
        checkQuickLoginEnabled(),
      ]);

      // Initialize database after auth checks
      await initializeDatabase();

      setAppState({
        isAppReady: fontsLoaded && !fontError,
        isAuthenticated: authStatus,
        hasSeenOnboarding: onboardingStatus,
        hasQuickLoginEnabled: quickLoginEnabled,
      });
    } catch (error) {
      console.error('App initialization error:', error);
      // More specific error handling
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      setAppState({
        isAppReady: fontsLoaded && !fontError,
        isAuthenticated: false,
        hasSeenOnboarding: false,
        hasQuickLoginEnabled: false,
      });
    }
  }, [fontsLoaded, fontError, checkQuickLoginEnabled, checkOnboardingStatus, checkAuthStatus]);

  // Run app preparation when fonts are loaded
  useEffect(() => {
    if (fontsLoaded && !fontError) {
      prepareApp();
    }
  }, [fontsLoaded, fontError, prepareApp]);

  // Setup AppState change handling
  useEffect(() => {
    const unsubscribe = checkOfflineStatus();
    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      unsubscribe();
      appStateSub.remove();
    };
  }, [handleAppStateChange]);

  // Callback to hide splash screen when app is ready - memoized
  const onLayoutRootView = useCallback(async () => {
    if (appState.isAppReady) {
      try {
        await SplashScreen.hideAsync();
      } catch (error) {
        console.error('Failed to hide splash screen', error);
      }
    }
  }, [appState.isAppReady]);

  // Navigation effect based on app state
  const navigateBasedOnAppState = useCallback(() => {
    const { isAppReady, hasSeenOnboarding, isAuthenticated, hasQuickLoginEnabled } = appState;

    if (isAppReady && hasSeenOnboarding !== null && isAuthenticated !== null && hasQuickLoginEnabled !== null) {
      let targetRoute: '/onboard' | '/home' | '/quick-login' | '/login' = '/login';

      if (!hasSeenOnboarding) {
        targetRoute = '/onboard';
      } else if (isAuthenticated) {
        targetRoute = '/home';
      } else if (hasQuickLoginEnabled) {
        targetRoute = '/quick-login';
      }

      router.replace(targetRoute);
    }
  }, [appState, router]);

  useEffect(() => {
    navigateBasedOnAppState();
  }, [navigateBasedOnAppState]);

  // Memoize the stack component to prevent unnecessary re-renders
  const stackNavigator = useMemo(
    () => (
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'ios',
        }}
      >
        <Stack.Screen name="(public)" />
        <Stack.Screen name="(auth)" options={{ animation: 'none' }} />
        <Stack.Screen name="+not-found" />
        <Stack.Screen name="onboard" />
      </Stack>
    ),
    []
  );

  // Show loading state while app is initializing
  if (
    !appState.isAppReady ||
    appState.isAuthenticated === null ||
    appState.hasSeenOnboarding === null ||
    appState.hasQuickLoginEnabled === null
  ) {
    return (
      <ThemeProvider>
        <Provider store={store}>
          <GestureHandlerRootView style={styles.container}>
            <PaperProvider>
              <LocaleProvider>
                <ThemedView style={styles.root}>
                  <ActivityIndicator size="large" />
                </ThemedView>
              </LocaleProvider>
            </PaperProvider>
          </GestureHandlerRootView>
        </Provider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <Provider store={store}>
        <GestureHandlerRootView style={styles.container}>
          <PaperProvider>
            <LocaleProvider>
              <ThemedView style={styles.root} onLayout={onLayoutRootView}>
                {stackNavigator}
              </ThemedView>
            </LocaleProvider>
          </PaperProvider>
        </GestureHandlerRootView>
      </Provider>
    </ThemeProvider>
  );
}

// Styles - memoize with StyleSheet.create
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  root: {
    flex: 1,
  },
});
