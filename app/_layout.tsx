import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  StyleSheet,
  UIManager,
  Platform,
  AppState,
  AppStateStatus,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { Provider } from "react-redux";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider } from "react-native-paper";
import "react-native-get-random-values";
import * as SecureStore from "expo-secure-store";

// --- Store ---
import { store } from "@/store";
import { setSyncStatus } from "@/store/reducers/authSlice";

// --- Services ---
import { createTable as createUserTable } from "@/services/localDB/userDB";
import { createQrTable } from "@/services/localDB/qrDB";
import {
  GUEST_USER_ID,
  checkInitialAuth,
  refreshAuthToken,
  checkGuestModeStatus,
  // loadGuestQrData, // No longer directly called by RootLayout
  getQuickLoginStatus,
} from "@/services/auth";
import { checkOfflineStatus } from "@/services/network";
import { storage } from "@/utils/storage";

// --- Context Providers ---
import { LocaleProvider } from "@/context/LocaleContext";
import { ThemeProvider } from "@/context/ThemeContext";

// --- Components & Utils ---
import { ThemedView } from "@/components/ThemedView";
import { cleanupResponsiveManager } from "@/utils/responsive";

// --- Constants ---
const ONBOARDING_STORAGE_KEY = "hasSeenOnboarding";

// Define possible navigation routes for type safety
type AppRoute =
  | "/onboard"
  | "/(guest)/guest-home"
  | "/(public)/login"
  | "/(auth)/home"
  | "/(public)/quick-login";

SplashScreen.preventAutoHideAsync();

interface AppInitState {
  isAppReady: boolean;
  isAuthenticated: boolean | null; // Represents if any valid session (guest or auth) is active
  hasSeenOnboarding: boolean | null;
  hasQuickLoginEnabled: boolean | null;
  useGuestMode: boolean; // User's preference for guest mode
}

const fontAssets = {
  "Roboto-Regular": require("../assets/fonts/Roboto-Regular.ttf"),
  "Roboto-Medium": require("../assets/fonts/Roboto-Medium.ttf"),
  "Roboto-Bold": require("../assets/fonts/Roboto-Bold.ttf"),
  "Roboto-Italic": require("../assets/fonts/Roboto-Italic.ttf"),
};

export default function RootLayout() {
  const router = useRouter();
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const [appState, setAppState] = useState<AppInitState>({
    isAppReady: false,
    isAuthenticated: null,
    hasSeenOnboarding: null,
    hasQuickLoginEnabled: null,
    useGuestMode: false,
  });
  const initializationRan = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const splashHiddenRef = useRef(false);

  useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const initializeDatabase = useCallback(async () => {
    try {
      console.log("[RootLayout] Initializing database tables...");
      await createUserTable();
      await createQrTable();
      console.log("[RootLayout] Database tables initialized/verified.");
    } catch (error) {
      console.error(
        "[RootLayout] Failed to initialize database tables:",
        error
      );
      throw error; // Re-throw to be caught by prepareApp
    }
  }, []);

  const checkOnboardingStatus = useCallback(async (): Promise<boolean> => {
    try {
      return storage.getBoolean(ONBOARDING_STORAGE_KEY) ?? false;
    } catch (error) {
      console.error("[RootLayout] Error reading onboarding status:", error);
      return false; // Default to false on error
    }
  }, []);

  const prepareApp = useCallback(async () => {
    if (initializationRan.current) {
      console.log("[RootLayout] prepareApp: Already ran.");
      return;
    }
    initializationRan.current = true;
    console.log("[RootLayout] prepareApp: Starting application preparation...");

    try {
      await initializeDatabase();
      const onboardingStatus = await checkOnboardingStatus();
      const quickLoginEnabled = await getQuickLoginStatus();
      const guestModePreference = await checkGuestModeStatus();

      console.log(
        `[RootLayout] prepareApp: Onboarding: ${onboardingStatus}, QuickLogin: ${quickLoginEnabled}, GuestPref: ${guestModePreference}`
      );

      // checkInitialAuth will now handle guest data loading internally if a guest session is established.
      // It determines if a session (either authenticated user or guest) is active.
      const sessionActive = await checkInitialAuth(!onboardingStatus);
      console.log(
        `[RootLayout] prepareApp: checkInitialAuth completed. SessionActive: ${sessionActive}`
      );

      // IMPORTANT: The `loadGuestQrData()` call previously here has been removed.
      // It's assumed that `checkInitialAuth` in `authService.ts` now handles
      // calling `loadGuestQrData` if it initializes or confirms a guest session.
      // See the comment at the top of this file for the required change in `authService.ts`.

      console.log(
        "[RootLayout] prepareApp: All checks complete. Setting app state."
      );
      setAppState({
        isAppReady: true,
        isAuthenticated: sessionActive, // Reflects if any valid session is active
        hasSeenOnboarding: onboardingStatus,
        hasQuickLoginEnabled: quickLoginEnabled,
        useGuestMode: guestModePreference, // Store the preference
      });
      console.log("[RootLayout] prepareApp: App state set. Preparation complete.");
    } catch (error) {
      console.error(
        "[RootLayout] prepareApp: CRITICAL App initialization error:",
        error
      );
      // Fallback state to allow app to potentially recover or show a login screen
      setAppState({
        isAppReady: true,
        isAuthenticated: false,
        hasSeenOnboarding: false, // Or try to read it again if possible
        hasQuickLoginEnabled: false,
        useGuestMode: false,
      });
    }
  }, [initializeDatabase, checkOnboardingStatus]); // Dependencies for useCallback

  useEffect(() => {
    if (fontsLoaded || fontError) {
      if (fontError) {
        console.error("[RootLayout] Font loading failed:", fontError);
        // Allow app to proceed without custom fonts, or handle more gracefully
        setAppState((prevState) => ({
          ...prevState,
          isAppReady: true, // Mark as ready to attempt rendering
          isAuthenticated: false, // Assume no auth if fonts fail critically for UI
          hasSeenOnboarding: prevState.hasSeenOnboarding ?? false,
          hasQuickLoginEnabled: false,
          useGuestMode: false,
        }));
      }
      // If fonts loaded successfully, or if there was an error but we decided to proceed
      if (fontsLoaded) {
        console.log("[RootLayout] Fonts loaded. Preparing app...");
        prepareApp();
      }
    }
  }, [fontsLoaded, fontError, prepareApp]);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      const currentLastSynced = store.getState().auth.lastSynced;
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        console.log("[RootLayout] App has come to the foreground.");
        const isOffline = store.getState().network.isOffline;
        if (!isOffline) {
          const authToken = await SecureStore.getItemAsync("authToken");
          const userID = await SecureStore.getItemAsync("userID");
          // Only refresh if it's an authenticated user, not guest
          if (authToken && userID && userID !== GUEST_USER_ID) {
            console.log(
              "[RootLayout] Attempting token refresh on app resume for authenticated user."
            );
            store.dispatch(
              setSyncStatus({
                isSyncing: true,
                lastSynced: currentLastSynced ?? undefined,
              })
            );
            try {
              const success = await refreshAuthToken(authToken);
              store.dispatch(
                setSyncStatus({
                  isSyncing: false,
                  lastSynced: success
                    ? new Date().toISOString()
                    : currentLastSynced ?? undefined,
                })
              );
            } catch (error) {
              console.error(
                "[RootLayout] Error during token refresh on app resume:",
                error
              );
              store.dispatch(
                setSyncStatus({
                  isSyncing: false,
                  lastSynced: currentLastSynced ?? undefined,
                })
              ); // Reset syncing status
            }
          } else {
            console.log(
              "[RootLayout] No valid auth token for refresh on resume, or user is guest."
            );
          }
        } else {
          console.log("[RootLayout] App resumed but offline, no token refresh.");
        }
      } else if (
        nextAppState === "inactive" ||
        nextAppState === "background"
      ) {
        cleanupResponsiveManager(); // Example cleanup task
      }
      appStateRef.current = nextAppState;
    };

    const appStateSubscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    const networkUnsubscribe = checkOfflineStatus(); // Initialize network status listener

    return () => {
      appStateSubscription.remove();
      if (networkUnsubscribe) networkUnsubscribe();
    };
  }, []); // Empty dependency array: runs once on mount, cleans up on unmount

  useEffect(() => {
    const {
      isAppReady,
      hasSeenOnboarding,
      isAuthenticated, // True if guest session OR auth session is active
      hasQuickLoginEnabled,
      useGuestMode, // The user's preference
    } = appState;

    // Ensure all critical states are resolved before attempting to navigate
    const canNavigate =
      isAppReady &&
      hasSeenOnboarding !== null &&
      isAuthenticated !== null && // checkInitialAuth result
      hasQuickLoginEnabled !== null;

    if (canNavigate) {
      let targetRoute: AppRoute;

      if (!hasSeenOnboarding) {
        targetRoute = "/onboard";
      } else if (useGuestMode) {
        // User prefers guest mode
        if (isAuthenticated) {
          // And a session (which should be guest) is active
          targetRoute = "/(guest)/guest-home";
        } else {
          // Guest mode preferred, but guest session failed to initialize
          console.warn(
            "[RootLayout] Guest mode preferred, but no active session. Fallback to login."
          );
          targetRoute = "/(public)/login"; // Fallback
        }
      } else if (isAuthenticated) {
        // Not preferring guest mode, and an authenticated session is active
        targetRoute = "/(auth)/home";
      } else if (hasQuickLoginEnabled) {
        // Not preferring guest, no auth session, but quick login is an option
        targetRoute = "/(public)/quick-login";
      } else {
        // Default fallback: login screen
        targetRoute = "/(public)/login";
      }

      console.log(
        `[RootLayout] Navigating. Onboarding: ${hasSeenOnboarding}, GuestModePref: ${useGuestMode}, SessionActive(isAuthenticated): ${isAuthenticated}, Target: ${targetRoute}`
      );
      router.replace(targetRoute);
    } else {
      console.log(
        "[RootLayout] Cannot navigate yet. App initialization not fully complete. AppState:",
        appState
      );
    }
  }, [appState, router]); // Re-run when appState or router changes

  const stackNavigator = useMemo(
    () => (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(guest)" options={{ animation: "ios" }} />
        <Stack.Screen name="(public)" options={{ animation: "ios" }} />
        <Stack.Screen name="(auth)" options={{ animation: "none" }} />
        <Stack.Screen name="onboard" options={{ animation: "ios" }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    ),
    []
  );

  const onLayoutRootView = useCallback(async () => {
    // Ensure all critical app states are determined before hiding splash
    if (
      appState.isAppReady &&
      appState.hasSeenOnboarding !== null &&
      appState.isAuthenticated !== null &&
      appState.hasQuickLoginEnabled !== null
    ) {
      if (!splashHiddenRef.current) {
        try {
          console.log("[RootLayout] Hiding splash screen NOW.");
          await SplashScreen.hideAsync();
          splashHiddenRef.current = true;
          console.log("[RootLayout] Splash screen hidden.");
        } catch (error) {
          console.error("[RootLayout] Failed to hide splash screen:", error);
        }
      }
    }
  }, [appState]); // Depends on the entire appState object

  // Render null (and keep splash screen visible) until essential checks are done
  if (
    !appState.isAppReady || // Primary flag from prepareApp
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
  },
});
