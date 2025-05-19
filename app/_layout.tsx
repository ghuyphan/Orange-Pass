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
  checkInitialAuth,
  // getQuickLoginStatus, // Assuming this exists in your auth service
  refreshAuthToken,
  checkGuestModeStatus,
} from "@/services/auth"; // Ensure getQuickLoginStatus is exported if used
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

SplashScreen.preventAutoHideAsync();

interface AppInitState {
  isAppReady: boolean;
  isAuthenticated: boolean | null; // True if any session (guest or user) is active
  hasSeenOnboarding: boolean | null;
  hasQuickLoginEnabled: boolean | null; // Assuming this state is managed
  useGuestMode: boolean;
}

const fontAssets = {
  "Roboto-Regular": require("../assets/fonts/Roboto-Regular.ttf"),
  "Roboto-Medium": require("../assets/fonts/Roboto-Medium.ttf"),
  "Roboto-Bold": require("../assets/fonts/Roboto-Bold.ttf"),
  "Roboto-Italic": require("../assets/fonts/Roboto-Italic.ttf"),
};

// Dummy function if getQuickLoginStatus is not yet implemented in your auth service
// Replace with your actual implementation.
async function getQuickLoginStatus(): Promise<boolean> {
  console.warn(
    "[RootLayout] Using dummy getQuickLoginStatus. Implement actual logic."
  );
  // Example: Check SecureStore or MMKV for quick login preferences
  // const prefs = storage.getString("quickLoginPrefs");
  // return prefs ? JSON.parse(prefs).isEnabled : false;
  return false; // Default to false
}

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
      await Promise.all([createUserTable(), createQrTable()]);
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

  const checkAuthAndGuestStatus = useCallback(
    async (
      onboardingComplete: boolean
    ): Promise<{ authStatus: boolean; guestModeStatus: boolean }> => {
      if (!onboardingComplete) {
        return { authStatus: false, guestModeStatus: false };
      }
      try {
        const guestMode = await checkGuestModeStatus();
        // checkInitialAuth will internally handle guest mode initialization
        // and return true if either guest or user session is established.
        const authSuccess = await checkInitialAuth();
        return { authStatus: authSuccess, guestModeStatus: guestMode };
      } catch (error) {
        console.error(
          "[RootLayout] Unexpected error during initial auth/guest check:",
          error
        );
        return { authStatus: false, guestModeStatus: false };
      }
    },
    []
  );

  const prepareApp = useCallback(async () => {
    if (initializationRan.current) {
      return;
    }
    initializationRan.current = true;
    console.log("[RootLayout] Starting app preparation...");

    try {
      // Initialize DB first, as auth checks might depend on it.
      await initializeDatabase();

      const [onboardingStatus, quickLoginEnabled] = await Promise.all([
        checkOnboardingStatus(),
        getQuickLoginStatus(), // Ensure this function is robust
      ]);
      console.log(
        `[RootLayout] Onboarding: ${onboardingStatus}, QuickLogin: ${quickLoginEnabled}`
      );

      // checkInitialAuth now handles guest mode internally and sets Redux state.
      // It returns true if any session (guest or user) is active.
      // We also need the explicit guest mode preference for navigation.
      const guestModePreference = await checkGuestModeStatus();
      const authSessionActive = await checkInitialAuth(); // This will call initializeGuestMode if guestModePreference is true

      console.log(
        `[RootLayout] GuestModePreference: ${guestModePreference}, AuthSessionActive: ${authSessionActive}`
      );

      setAppState({
        isAppReady: true,
        isAuthenticated: authSessionActive, // True if guest OR user session is active
        hasSeenOnboarding: onboardingStatus,
        hasQuickLoginEnabled: quickLoginEnabled,
        useGuestMode: guestModePreference, // The user's explicit preference
      });
      console.log("[RootLayout] App preparation complete. AppState set.");
    } catch (error) {
      console.error("[RootLayout] CRITICAL App initialization error:", error);
      // Fallback to a safe state
      setAppState({
        isAppReady: true,
        isAuthenticated: false,
        hasSeenOnboarding: false, // Or try to read again if error was unrelated
        hasQuickLoginEnabled: false,
        useGuestMode: false,
      });
    }
  }, [initializeDatabase, checkOnboardingStatus]); // Removed checkAuthAndGuestStatus as checkInitialAuth is now primary

  useEffect(() => {
    if (fontsLoaded || fontError) {
      if (fontError) {
        console.error("[RootLayout] Font loading failed:", fontError);
        // Critical error, but still mark app as "ready" to potentially show an error UI or fallback
        setAppState(prevState => ({
          ...prevState,
          isAppReady: true,
          isAuthenticated: false, // Ensure no auth attempt if fonts fail
          hasSeenOnboarding: prevState.hasSeenOnboarding ?? false, // Keep if already checked
          hasQuickLoginEnabled: false,
          useGuestMode: false,
        }));
      } else {
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
          const userID = await SecureStore.getItemAsync("userID"); // Check userID too
          if (authToken && userID && userID !== GUEST_USER_ID) { // Only refresh for logged-in users
            console.log("[RootLayout] Attempting token refresh on app resume.");
            store.dispatch(
              setSyncStatus({ isSyncing: true, lastSynced: currentLastSynced ?? undefined })
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
                setSyncStatus({ isSyncing: false, lastSynced: currentLastSynced ?? undefined })
              );
            }
          } else {
            console.log("[RootLayout] No valid auth token for refresh on resume or is guest.");
          }
        } else {
          console.log("[RootLayout] App resumed but offline.");
        }
      } else if (
        nextAppState === "inactive" ||
        nextAppState === "background"
      ) {
        cleanupResponsiveManager();
      }
      appStateRef.current = nextAppState;
    };

    const appStateSubscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    const networkUnsubscribe = checkOfflineStatus();

    return () => {
      appStateSubscription.remove();
      if (networkUnsubscribe) networkUnsubscribe();
    };
  }, []); // Empty dependency array as AppState and network are global

  useEffect(() => {
    const {
      isAppReady,
      hasSeenOnboarding,
      isAuthenticated,
      hasQuickLoginEnabled,
      useGuestMode,
    } = appState;

    // Ensure all flags are determined before navigating
    const canNavigate =
      isAppReady &&
      hasSeenOnboarding !== null &&
      isAuthenticated !== null && // This means checkInitialAuth has run
      hasQuickLoginEnabled !== null;

    if (canNavigate) {
      let targetRoute: string;

      if (!hasSeenOnboarding) {
        targetRoute = "/onboard";
      } else if (useGuestMode) {
        // If guest mode was the determined state from storage
        if (isAuthenticated) { // And guest session was successfully initialized
          targetRoute = "/(guest)/guest-home"; // Corrected path
        } else {
          // Guest mode preferred, but guest session init failed (should be rare)
          console.warn("[RootLayout] Guest mode preferred, but guest session failed. Fallback to login.");
          targetRoute = "/(public)/login"; // Corrected path
        }
      } else if (isAuthenticated) {
        // Not guest mode, and an authenticated (logged-in user) session is active
        targetRoute = "/(auth)/home"; // Corrected path
      } else if (hasQuickLoginEnabled) {
        targetRoute = "/(public)/quick-login"; // Corrected path
      } else {
        targetRoute = "/(public)/login"; // Corrected path
      }
      console.log(
        `[RootLayout] Navigating. Onboarding: ${hasSeenOnboarding}, GuestModePref: ${useGuestMode}, SessionActive: ${isAuthenticated}, Target: ${targetRoute}`
      );
      router.replace(targetRoute);
    } else {
      console.log("[RootLayout] Cannot navigate yet. AppState:", appState);
    }
  }, [appState, router]);

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
    if (appState.isAppReady) {
      // Additional check to ensure navigation flags are also ready
      if (
        appState.hasSeenOnboarding !== null &&
        appState.isAuthenticated !== null &&
        appState.hasQuickLoginEnabled !== null
      ) {
        try {
          await SplashScreen.hideAsync();
          console.log("[RootLayout] Splash screen hidden.");
        } catch (error) {
          console.error("[RootLayout] Failed to hide splash screen:", error);
        }
      }
    }
  }, [appState]);

  if (
    !appState.isAppReady ||
    appState.isAuthenticated === null ||
    appState.hasSeenOnboarding === null ||
    appState.hasQuickLoginEnabled === null
  ) {
    // console.log("[RootLayout] Rendering null, app not fully ready. State:", appState);
    return null; // Keep splash screen visible or show a minimal loading indicator
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
