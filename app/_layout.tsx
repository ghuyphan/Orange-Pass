import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  UIManager,
  Platform,
  AppState,
  // LogBox, // Assuming you'll manage this elsewhere or don't need it for now
  AppStateStatus,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import 'react-native-get-random-values';
import * as SecureStore from 'expo-secure-store';

// --- Store ---
import { store } from '@/store';
import { setSyncStatus } from '@/store/reducers/authSlice';

// --- Services ---
import { createTable as createUserTable } from '@/services/localDB/userDB';
import { createQrTable } from '@/services/localDB/qrDB';
import {
  checkInitialAuth,
  getQuickLoginStatus,
  refreshAuthToken,
} from '@/services/auth';
import { checkOfflineStatus } from '@/services/network';
import { storage } from '@/utils/storage';

// --- Context Providers ---
import { LocaleProvider } from '@/context/LocaleContext';
import { ThemeProvider } from '@/context/ThemeContext';

// --- Components & Utils ---
import { ThemedView } from '@/components/ThemedView';
import { cleanupResponsiveManager } from '@/utils/responsive';

// --- Constants ---
const ONBOARDING_STORAGE_KEY = 'hasSeenOnboarding';
// const LOG_PREFIX = '[RootLayout]'; // Logs removed

SplashScreen.preventAutoHideAsync();

interface AppInitState {
  isAppReady: boolean;
  isAuthenticated: boolean | null;
  hasSeenOnboarding: boolean | null;
  hasQuickLoginEnabled: boolean | null;
}

// Consider if all these fonts are needed for the initial screen.
// Fewer fonts, or smaller variable fonts, can reduce load time.
const fontAssets = {
  'Roboto-Regular': require('../assets/fonts/Roboto-Regular.ttf'),
  'Roboto-Medium': require('../assets/fonts/Roboto-Medium.ttf'),
  'Roboto-Bold': require('../assets/fonts/Roboto-Bold.ttf'),
  'Roboto-Italic': require('../assets/fonts/Roboto-Italic.ttf'),
};
export default function RootLayout() {
  const router = useRouter();
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const [appState, setAppState] = useState<AppInitState>({
    isAppReady: false,
    isAuthenticated: null,
    hasSeenOnboarding: null,
    hasQuickLoginEnabled: null,
  });
  const initializationRan = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (
      Platform.OS === 'android' &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const initializeDatabase = useCallback(async () => {
    try {
      await Promise.all([createUserTable(), createQrTable()]);
    } catch (error) {
      console.error(
        '[RootLayout] Failed to initialize database tables:',
        error,
      );
      throw error;
    }
  }, []);

  const checkOnboardingStatus = useCallback(async (): Promise<boolean> => {
    try {
      return storage.getBoolean(ONBOARDING_STORAGE_KEY) ?? false;
    } catch (error) {
      console.error(
        '[RootLayout] Error reading onboarding status:',
        error,
      );
      return false;
    }
  }, []);

  const checkAuthStatus = useCallback(
    async (onboardingComplete: boolean): Promise<boolean> => {
      if (!onboardingComplete) {
        return false;
      }
      try {
        return await checkInitialAuth();
      } catch (error) {
        console.error(
          '[RootLayout] Unexpected error during initial auth check call:',
          error,
        );
        return false;
      }
    },
    [],
  );

  const checkQuickLoginEnabled = useCallback(async (): Promise<boolean> => {
    try {
      return await getQuickLoginStatus();
    } catch (error) {
      console.error(
        '[RootLayout] Error checking quick login status:',
        error,
      );
      return false;
    }
  }, []);

  const prepareApp = useCallback(async () => {
    if (initializationRan.current) {
      return;
    }
    initializationRan.current = true;

    try {
      const [onboardingStatus, quickLoginEnabled, _dbResult] =
        await Promise.all([
          checkOnboardingStatus(),
          checkQuickLoginEnabled(),
          initializeDatabase(),
        ]);

      const authStatus = await checkAuthStatus(onboardingStatus);

      setAppState({
        isAppReady: true,
        isAuthenticated: authStatus,
        hasSeenOnboarding: onboardingStatus,
        hasQuickLoginEnabled: quickLoginEnabled,
      });
    } catch (error) {
      console.error('[RootLayout] CRITICAL App initialization error:', error);
      setAppState({
        isAppReady: true,
        isAuthenticated: false,
        hasSeenOnboarding: false,
        hasQuickLoginEnabled: false,
      });
    }
  }, [
    initializeDatabase,
    checkOnboardingStatus,
    checkAuthStatus,
    checkQuickLoginEnabled,
  ]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      if (fontError) {
        console.error('[RootLayout] Font loading failed:', fontError);
        setAppState((prevState) => ({
          ...prevState,
          isAppReady: true,
          isAuthenticated: false,
          hasSeenOnboarding: false,
          hasQuickLoginEnabled: false,
        }));
      } else {
        prepareApp();
      }
    }
  }, [fontsLoaded, fontError, prepareApp]);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        const isOffline = store.getState().network.isOffline;
        if (!isOffline) {
          const authToken = await SecureStore.getItemAsync('authToken');
          if (authToken) {
            store.dispatch(setSyncStatus({ isSyncing: true }));
            try {
              const success = await refreshAuthToken(authToken);
              if (success) {
                store.dispatch(
                  setSyncStatus({
                    isSyncing: false,
                    lastSynced: new Date().toISOString(),
                  }),
                );
              } else {
                store.dispatch(setSyncStatus({ isSyncing: false }));
              }
            } catch (error) {
              console.error(
                '[RootLayout] Error during token refresh on app resume:',
                error,
              );
              store.dispatch(setSyncStatus({ isSyncing: false }));
            }
          }
        }
      } else if (nextAppState === 'inactive' || nextAppState === 'background') {
        cleanupResponsiveManager();
      }
      appStateRef.current = nextAppState;
    };

    const appStateSubscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    const networkUnsubscribe = checkOfflineStatus();

    return () => {
      appStateSubscription.remove();
      networkUnsubscribe();
    };
  }, []); // Dependencies are stable.

  useEffect(() => {
    const {
      isAppReady,
      hasSeenOnboarding,
      isAuthenticated,
      hasQuickLoginEnabled,
    } = appState;

    const canNavigate =
      isAppReady &&
      hasSeenOnboarding !== null &&
      isAuthenticated !== null &&
      hasQuickLoginEnabled !== null;

    if (canNavigate) {
      let targetRoute: '/onboard' | '/home' | '/quick-login' | '/login';

      if (!hasSeenOnboarding) {
        targetRoute = '/onboard';
      } else if (isAuthenticated) {
        targetRoute = '/home';
      } else if (hasQuickLoginEnabled) {
        targetRoute = '/quick-login';
      } else {
        targetRoute = '/login';
      }
      router.replace(targetRoute);
    }
  }, [appState, router]);

  const stackNavigator = useMemo(
    () => (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(public)" options={{ animation: 'ios' }} />
        <Stack.Screen name="(auth)" options={{ animation: 'none' }} />
        <Stack.Screen name="onboard" options={{ animation: 'ios' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    ),
    [],
  );

  const onLayoutRootView = useCallback(async () => {
    if (appState.isAppReady) {
      try {
        await SplashScreen.hideAsync();
      } catch (error) {
        console.error('[RootLayout] Failed to hide splash screen:', error);
      }
    }
  }, [appState.isAppReady]);

  // Render null until all critical flags are determined.
  // This prevents rendering the main structure prematurely.
  if (
    !appState.isAppReady ||
    appState.isAuthenticated === null ||
    appState.hasSeenOnboarding === null ||
    appState.hasQuickLoginEnabled === null
  ) {
    return null;
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  root: {
    flex: 1,
    // Consider adding a default background color matching your theme
    // to prevent flashes if there's any delay between native splash and RN render.
    // backgroundColor: '#FFFFFF', // Example
  },
});
