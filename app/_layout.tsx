import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { StyleSheet, UIManager, Platform, AppState, LogBox } from 'react-native'; // Import LogBox
import { Stack, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Provider } from 'react-redux'; // Removed useDispatch as it wasn't used here
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import 'react-native-get-random-values';

// --- Store ---
import { store } from '@/store'; // Removed AppDispatch import

// --- Services ---
// Assuming these functions handle their own specific errors internally
import { createTable as createUserTable } from '@/services/localDB/userDB';
import { createQrTable } from '@/services/localDB/qrDB';
// Ensure getQuickLoginStatus is correctly imported and implemented in '@/services/auth'
import { checkInitialAuth, getQuickLoginStatus } from '@/services/auth';
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
const LOG_PREFIX = '[RootLayout]'; // Keep prefix for remaining logs

// --- Ignore specific warnings if necessary (use cautiously) ---
// LogBox.ignoreLogs(['Warning: ...']); // Example

// Prevent native splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// --- Type Definitions ---
interface AppInitState {
  isAppReady: boolean;
  isAuthenticated: boolean | null; // Determined by checkInitialAuth
  hasSeenOnboarding: boolean | null;
  hasQuickLoginEnabled: boolean | null;
}

// --- Font Assets ---
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

// --- Root Layout Component ---
export default function RootLayout() {
  const router = useRouter();

  // --- State ---
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const [appState, setAppState] = useState<AppInitState>({
    isAppReady: false,
    isAuthenticated: null,
    hasSeenOnboarding: null,
    hasQuickLoginEnabled: null,
  });
  const initializationRan = useRef(false); // Prevent prepareApp running multiple times

  // --- Android Specific Setup ---
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // --- Memoized Initialization Callbacks ---

  // Initializes core database tables. Critical failure stops app prep.
  const initializeDatabase = useCallback(async () => {
    try {
      // Assuming these are idempotent (safe to run multiple times)
      await Promise.all([createUserTable(), createQrTable()]);
      // console.log(LOG_PREFIX, 'Database tables initialized.'); // Removed verbose log
    } catch (error) {
      console.error(LOG_PREFIX, 'Failed to initialize database tables:', error);
      throw error; // Propagate error to stop prepareApp
    }
  }, []);

  // Checks if the user has completed the onboarding flow.
  const checkOnboardingStatus = useCallback(async (): Promise<boolean> => {
    try {
      // Assuming storage.getBoolean is synchronous (like MMKV)
      const status = storage.getBoolean(ONBOARDING_STORAGE_KEY) ?? false;
      // console.log(LOG_PREFIX, `Onboarding status: ${status}.`); // Removed verbose log
      return status;
    } catch (error) {
      console.error(LOG_PREFIX, 'Error reading onboarding status:', error);
      return false; // Default to false on error
    }
  }, []);

  // Checks initial authentication state using the optimized service function.
  const checkAuthStatus = useCallback(async (onboardingComplete: boolean): Promise<boolean> => {
    // Skip check if onboarding isn't done (user will be routed to /onboard)
    if (!onboardingComplete) {
      // console.log(LOG_PREFIX, 'Auth check skipped: Onboarding not complete.'); // Removed verbose log
      return false;
    }
    try {
      // checkInitialAuth is now faster as it doesn't await network refresh
      const authResult = await checkInitialAuth();
      // console.log(LOG_PREFIX, `Initial auth status from service: ${authResult}`); // Removed verbose log
      return authResult; // Returns true if local user data exists
    } catch (error) {
      // checkInitialAuth should handle its internal errors, but catch unexpected ones
      console.error(LOG_PREFIX, 'Unexpected error during initial auth check call:', error);
      return false;
    }
  }, []);

  // Checks if quick login (e.g., Biometrics) is enabled.
  const checkQuickLoginEnabled = useCallback(async (): Promise<boolean> => {
    try {
      // Ensure getQuickLoginStatus exists and handles its errors
      const enabled = await getQuickLoginStatus();
      // console.log(LOG_PREFIX, `Quick Login status: ${enabled}.`); // Removed verbose log
      return enabled;
    } catch (error) {
      console.error(LOG_PREFIX, 'Error checking quick login status:', error);
      return false; // Default to false on error
    }
  }, []);

  // --- Main App Preparation Function ---
  // Orchestrates the essential checks needed before navigating the user.
  const prepareApp = useCallback(async () => {
    if (initializationRan.current) return;
    initializationRan.current = true;

    try {
      // Run non-dependent checks concurrently
      const [onboardingStatus, quickLoginEnabled, _dbResult] = await Promise.all([
        checkOnboardingStatus(),
        checkQuickLoginEnabled(),
        initializeDatabase(), // Critical, might be needed by auth implicitly
      ]);

      // Run auth check (depends on onboarding status)
      const authStatus = await checkAuthStatus(onboardingStatus);

      setAppState({
        isAppReady: true, // Ready to render and hide splash
        isAuthenticated: authStatus,
        hasSeenOnboarding: onboardingStatus,
        hasQuickLoginEnabled: quickLoginEnabled,
      });

    } catch (error) {
      // Catch critical errors from initialization steps (e.g., DB init failure)
      console.error(LOG_PREFIX, 'CRITICAL App initialization error:', error);
      // Mark as ready to render an error state if needed, but assume unauthenticated
      setAppState({
        isAppReady: true,
        isAuthenticated: false,
        hasSeenOnboarding: false, // Sensible defaults on critical failure
        hasQuickLoginEnabled: false,
      });
    }
  }, [ // Dependencies for prepareApp
    initializeDatabase,
    checkOnboardingStatus,
    checkAuthStatus,
    checkQuickLoginEnabled
  ]
  );

  // --- Effects ---

  // Effect: Trigger app preparation once fonts are loaded (or failed).
  useEffect(() => {
    // Only proceed if fonts have loaded or if there was a font error
    if (fontsLoaded || fontError) {
      if (fontError) {
        console.error(LOG_PREFIX, 'Font loading failed:', fontError);
        // Mark app as ready even on font error to hide splash and potentially show error UI
        setAppState(prevState => ({
          ...prevState,
          isAppReady: true, // Allow splash hide
          isAuthenticated: false, // Assume failure state
          hasSeenOnboarding: false,
          hasQuickLoginEnabled: false,
        }));
      } else {
        // Fonts loaded successfully, run the main preparation logic
        prepareApp();
      }
    }
  }, [fontsLoaded, fontError, prepareApp]);

  // Effect: Setup AppState and Network status listeners on mount.
  useEffect(() => {
    // Listener for app state changes (e.g., background/foreground)
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'inactive' || nextAppState === 'background') {
        cleanupResponsiveManager(); // Example cleanup task
      }
      // Add other background/inactive handlers if needed
    };
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // Setup network status listener
    const networkUnsubscribe = checkOfflineStatus(); // Assumes this returns an unsubscribe function

    // Cleanup listeners on component unmount
    return () => {
      // console.log(LOG_PREFIX, 'Cleaning up AppState & Network listeners.'); // Removed verbose log
      appStateSubscription.remove();
      networkUnsubscribe();
    };
  }, []); // Run only once on mount

  // Effect: Handle initial navigation once app state is determined.
  useEffect(() => {
    const { isAppReady, hasSeenOnboarding, isAuthenticated, hasQuickLoginEnabled } = appState;

    // Ensure all flags are set (not null) before attempting to navigate
    const canNavigate = isAppReady &&
      hasSeenOnboarding !== null &&
      isAuthenticated !== null &&
      hasQuickLoginEnabled !== null;

    if (canNavigate) {
      let targetRoute: '/onboard' | '/home' | '/quick-login' | '/login';

      if (!hasSeenOnboarding) {
        targetRoute = '/onboard';
      } else if (isAuthenticated) { // User has valid local data via checkInitialAuth
        targetRoute = '/home';
      } else if (hasQuickLoginEnabled) { // Onboarding done, not authenticated, but quick login available
        targetRoute = '/quick-login';
      } else { // Onboarding done, not authenticated, no quick login
        targetRoute = '/login';
      }
      router.replace(targetRoute); // Use replace to avoid splash/loading state in back stack

    }
    // No else needed, navigation will re-run when appState changes
  }, [appState, router]); // Re-run when appState changes

  // --- Memoized Components ---
  // Memoize stack navigator structure as it's static
  const stackNavigator = useMemo(() => (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Define group routes or individual screens */}
      <Stack.Screen name="(public)" options={{ animation: 'ios' }} />
      <Stack.Screen name="(auth)" options={{ animation: 'none' }} />
      <Stack.Screen name="onboard" options={{ animation: 'ios' }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  ), []);

  // --- Render Logic ---

  // Callback to hide splash screen once the main layout is rendered and ready
  const onLayoutRootView = useCallback(async () => {
    if (appState.isAppReady) {
      try {
        await SplashScreen.hideAsync();
        // console.log(LOG_PREFIX, 'Splash screen hidden.'); // Removed verbose log
      } catch (error) {
        console.error(LOG_PREFIX, 'Failed to hide splash screen:', error);
      }
    }
  }, [appState.isAppReady]);

  // Render nothing (splash remains visible) until all readiness checks pass
  if (!appState.isAppReady || appState.isAuthenticated === null || appState.hasSeenOnboarding === null || appState.hasQuickLoginEnabled === null) {
    // console.log(LOG_PREFIX, 'Waiting for app state determination...'); // Removed verbose log
    return null;
  }

  // Render the main application structure
  // console.log(LOG_PREFIX, 'Rendering main app structure...'); // Removed verbose log
  return (
    <ThemeProvider>
      <Provider store={store}>
        <GestureHandlerRootView style={styles.container}>
          <PaperProvider>
            <LocaleProvider>
              {/* ThemedView acts as the root view for layout callback */}
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

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  root: {
    flex: 1,
    // Add a background color matching your theme's default to avoid flashes
    // backgroundColor: 'your_theme_background_color',
  },
});