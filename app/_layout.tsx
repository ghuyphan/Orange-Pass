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
  refreshAuthToken,
  checkGuestModeStatus,
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
import { GUEST_USER_ID } from "@/constants/Constants";

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
  initializationComplete: boolean; // True when fonts settled AND prepareApp logic is done
  isAuthenticated: boolean | null; // Active session (guest or auth)
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
    initializationComplete: false,
    isAuthenticated: null,
    hasSeenOnboarding: null,
    hasQuickLoginEnabled: null,
    useGuestMode: false,
  });
  const initializationRan = useRef(false); // Tracks if prepareApp has been initiated
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
      throw error;
    }
  }, []);

  const checkOnboardingStatus = useCallback(async (): Promise<boolean> => {
    try {
      return storage.getBoolean(ONBOARDING_STORAGE_KEY) ?? false;
    } catch (error) {
      console.error("[RootLayout] Error reading onboarding status:", error);
      return false;
    }
  }, []);

  const prepareApp = useCallback(async () => {
    if (initializationRan.current) {
      console.log("[RootLayout] prepareApp: Already ran or in progress.");
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

      const sessionActive = await checkInitialAuth(!onboardingStatus);
      console.log(
        `[RootLayout] prepareApp: checkInitialAuth completed. SessionActive: ${sessionActive}`
      );

      console.log(
        "[RootLayout] prepareApp: All checks complete. Setting app state."
      );
      setAppState({
        initializationComplete: true,
        isAuthenticated: sessionActive,
        hasSeenOnboarding: onboardingStatus,
        hasQuickLoginEnabled: quickLoginEnabled,
        useGuestMode: guestModePreference,
      });
      console.log(
        "[RootLayout] prepareApp: App state set. Preparation complete."
      );
    } catch (error) {
      console.error(
        "[RootLayout] prepareApp: CRITICAL App initialization error:",
        error
      );
      setAppState({
        initializationComplete: true, // Mark as complete to allow fallback UI
        isAuthenticated: false,
        hasSeenOnboarding: (await checkOnboardingStatus()) ?? false, // Attempt to re-check or default
        hasQuickLoginEnabled: false,
        useGuestMode: false,
      });
    }
  }, [initializeDatabase, checkOnboardingStatus]);

  useEffect(() => {
    // This effect runs when font loading status changes (fontsLoaded or fontError)
    if (fontsLoaded || fontError) {
      if (fontError) {
        console.error("[RootLayout] Font loading failed:", fontError);
        // Proceed with app preparation even if fonts fail. UI can use system fonts.
      }
      if (fontsLoaded) {
        console.log("[RootLayout] Fonts loaded successfully.");
      }

      // Call prepareApp once fonts are settled (loaded or failed),
      // but only if it hasn't been initiated yet.
      // The initializationRan ref inside prepareApp handles multiple calls,
      // but this check prevents calling it if already running due to font state flicker.
      if (!initializationRan.current) {
        console.log(
          "[RootLayout] Font loading settled. Initiating app preparation..."
        );
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
              );
            }
          } else {
            console.log(
              "[RootLayout] No valid auth token for refresh on resume, or user is guest."
            );
          }
        } else {
          console.log(
            "[RootLayout] App resumed but offline, no token refresh."
          );
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
  }, []);

  useEffect(() => {
    if (!appState.initializationComplete) {
      console.log(
        "[RootLayout] Navigation deferred: App initialization not fully complete.",
        appState
      );
      return;
    }

    // At this point, all nullable states should have been resolved by prepareApp
    const {
      hasSeenOnboarding,
      isAuthenticated,
      hasQuickLoginEnabled,
      useGuestMode,
    } = appState;

    if (
      hasSeenOnboarding === null ||
      isAuthenticated === null ||
      hasQuickLoginEnabled === null
    ) {
      console.error(
        "[RootLayout] CRITICAL NAVIGATION ERROR: Initialization complete, but essential states are null. Fallback to login.",
        appState
      );
      router.replace("/(public)/login"); // Fallback to a safe route
      return;
    }

    let targetRoute: AppRoute;

    if (!hasSeenOnboarding) {
      targetRoute = "/onboard";
    } else if (useGuestMode) {
      if (isAuthenticated) {
        targetRoute = "/(guest)/guest-home";
      } else {
        console.warn(
          "[RootLayout] Guest mode preferred, but no active session. Fallback to login."
        );
        targetRoute = "/(public)/login";
      }
    } else if (isAuthenticated) {
      targetRoute = "/(auth)/home";
    } else if (hasQuickLoginEnabled) {
      targetRoute = "/(public)/quick-login";
    } else {
      targetRoute = "/(public)/login";
    }

    console.log(
      `[RootLayout] Navigating. Onboarding: ${hasSeenOnboarding}, GuestModePref: ${useGuestMode}, SessionActive(isAuthenticated): ${isAuthenticated}, Target: ${targetRoute}`
    );
    router.replace(targetRoute);
  }, [appState, router]); // Re-run when appState (specifically initializationComplete and its dependent values) or router changes

  const stackNavigator = useMemo(
    () => (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(guest)" options={{ animation: "ios" }} />
        <Stack.Screen name="(public)" options={{ animation: "ios" }} />
        <Stack.Screen name="(auth)" options={{ animation: "none" }} />
        <Stack.Screen
          name="onboard"
          options={{ animation: "slide_from_bottom" }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
    ),
    []
  );

  const onLayoutRootView = useCallback(async () => {
    if (appState.initializationComplete) {
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
  }, [appState.initializationComplete]); // Depend only on the flag that matters

  if (!appState.initializationComplete) {
    // Keep splash screen visible until all essential setup is done
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
