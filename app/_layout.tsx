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
import { setSyncStatus, clearAuthData } from "@/store/reducers/authSlice";

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
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes
const BACKGROUND_TIME_THRESHOLD = 30 * 60 * 1000; // 30 minutes

// Define possible navigation routes for type safety
type AppRoute =
  | "/onboard"
  | "/(guest)/guest-home"
  | "/(public)/login"
  | "/(auth)/home"
  | "/(public)/quick-login";

SplashScreen.preventAutoHideAsync();

interface AppInitState {
  initializationComplete: boolean;
  isAuthenticated: boolean | null;
  hasSeenOnboarding: boolean | null;
  hasQuickLoginEnabled: boolean | null;
  useGuestMode: boolean;
}

const fontAssets = {
  "Roboto-Regular": require("../assets/fonts/Roboto-Regular.ttf"),
  "Roboto-Medium": require("../assets/fonts/Roboto-Medium.ttf"),
  "Roboto-Bold": require("../assets/fonts/Roboto-Bold.ttf"),
  "Roboto-Italic": require("../assets/fonts/Roboto-Italic.ttf"),
};

// Token Management Class
class TokenManager {
  private static lastRefreshTime = 0;
  private static backgroundStartTime = 0;
  private static isRefreshing = false;

  static shouldRefreshToken(authToken: string | null, userID: string | null): boolean {
    if (!authToken || !userID || userID === GUEST_USER_ID || this.isRefreshing) {
      return false;
    }

    const now = Date.now();
    const timeSinceLastRefresh = now - this.lastRefreshTime;
    const backgroundDuration = this.backgroundStartTime > 0 ? now - this.backgroundStartTime : 0;

    // Only refresh if:
    // 1. Haven't refreshed recently AND
    // 2. App was in background for significant time
    return (
      timeSinceLastRefresh > TOKEN_REFRESH_THRESHOLD &&
      backgroundDuration > BACKGROUND_TIME_THRESHOLD
    );
  }

  static async performTokenRefresh(router: any): Promise<boolean> {
    if (this.isRefreshing) {
      console.log("[TokenManager] Refresh already in progress");
      return true;
    }

    try {
      const authToken = await SecureStore.getItemAsync("authToken");
      const userID = await SecureStore.getItemAsync("userID");

      if (!this.shouldRefreshToken(authToken, userID)) {
        console.log("[TokenManager] Token refresh not needed");
        return true;
      }

      this.isRefreshing = true;
      console.log("[TokenManager] Starting token refresh after background period");

      const currentLastSynced = store.getState().auth.lastSynced;
      store.dispatch(setSyncStatus({
        isSyncing: true,
        lastSynced: currentLastSynced ?? undefined,
      }));

      const success = await refreshAuthToken(authToken!);

      if (success) {
        this.lastRefreshTime = Date.now();
        store.dispatch(setSyncStatus({
          isSyncing: false,
          lastSynced: new Date().toISOString(),
        }));
        console.log("[TokenManager] Token refresh successful");
        return true;
      } else {
        console.warn("[TokenManager] Token refresh failed - clearing auth");
        await this.handleAuthFailure(router);
        return false;
      }
    } catch (error) {
      console.error("[TokenManager] Token refresh error:", error);
      await this.handleAuthFailure(router);
      return false;
    } finally {
      this.isRefreshing = false;
      store.dispatch(setSyncStatus({
        isSyncing: false,
        lastSynced: store.getState().auth.lastSynced ?? undefined,
      }));
    }
  }

  private static async handleAuthFailure(router: any): Promise<void> {
    try {
      // Clear invalid tokens
      await SecureStore.deleteItemAsync("authToken");
      await SecureStore.deleteItemAsync("userID");

      // Reset auth state
      store.dispatch(clearAuthData());

      // Navigate to login
      router.replace("/(public)/login");
    } catch (error) {
      console.error("[TokenManager] Error handling auth failure:", error);
    }
  }

  static onAppBackground(): void {
    this.backgroundStartTime = Date.now();
    console.log("[TokenManager] App backgrounded at:", new Date().toISOString());
  }

  static onAppForeground(): void {
    console.log("[TokenManager] App foregrounded at:", new Date().toISOString());
    // Reset background timer but don't automatically refresh
    this.backgroundStartTime = 0;
  }

  static reset(): void {
    this.lastRefreshTime = 0;
    this.backgroundStartTime = 0;
    this.isRefreshing = false;
  }
}

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

  // Refs for managing state
  const initializationPromise = useRef<Promise<void> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const splashHiddenRef = useRef(false);

  // Initialize Android layout animations
  useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // Database initialization
  const initializeDatabase = useCallback(async (): Promise<void> => {
    try {
      console.log("[RootLayout] Initializing database tables...");
      await Promise.all([
        createUserTable(),
        createQrTable(),
      ]);
      console.log("[RootLayout] Database tables initialized successfully");
    } catch (error) {
      console.error("[RootLayout] Failed to initialize database tables:", error);
      throw error;
    }
  }, []);

  // Check onboarding status
  const checkOnboardingStatus = useCallback(async (): Promise<boolean> => {
    try {
      const hasSeenOnboarding = storage.getBoolean(ONBOARDING_STORAGE_KEY) ?? false;
      console.log("[RootLayout] Onboarding status:", hasSeenOnboarding);
      return hasSeenOnboarding;
    } catch (error) {
      console.error("[RootLayout] Error reading onboarding status:", error);
      return false;
    }
  }, []);

  // Main app preparation function
  const prepareApp = useCallback(async (): Promise<void> => {
    // Prevent multiple simultaneous initializations
    if (initializationPromise.current) {
      console.log("[RootLayout] App preparation already in progress");
      return initializationPromise.current;
    }

    initializationPromise.current = (async () => {
      console.log("[RootLayout] Starting app preparation...");

      try {
        // Initialize core services
        await initializeDatabase();

        // Get all required status checks in parallel
        const [
          onboardingStatus,
          quickLoginEnabled,
          guestModePreference,
        ] = await Promise.all([
          checkOnboardingStatus(),
          getQuickLoginStatus(),
          checkGuestModeStatus(),
        ]);

        console.log("[RootLayout] Status checks complete:", {
          onboarding: onboardingStatus,
          quickLogin: quickLoginEnabled,
          guestMode: guestModePreference,
        });

        // Check authentication status
        const sessionActive = await checkInitialAuth(!onboardingStatus);
        console.log("[RootLayout] Authentication check complete. Active session:", sessionActive);

        // Update app state with all resolved values
        setAppState({
          initializationComplete: true,
          isAuthenticated: sessionActive,
          hasSeenOnboarding: onboardingStatus,
          hasQuickLoginEnabled: quickLoginEnabled,
          useGuestMode: guestModePreference,
        });

        console.log("[RootLayout] App preparation completed successfully");
      } catch (error) {
        console.error("[RootLayout] CRITICAL: App initialization failed:", error);

        // Set fallback state to prevent app from being stuck
        setAppState({
          initializationComplete: true,
          isAuthenticated: false,
          hasSeenOnboarding: false,
          hasQuickLoginEnabled: false,
          useGuestMode: false,
        });
      }
    })();

    return initializationPromise.current;
  }, [initializeDatabase, checkOnboardingStatus]);

  // Handle font loading and app preparation
  useEffect(() => {
    if (fontsLoaded || fontError) {
      if (fontError) {
        console.error("[RootLayout] Font loading failed:", fontError);
      } else {
        console.log("[RootLayout] Fonts loaded successfully");
      }

      // Start app preparation once fonts are settled
      prepareApp().catch(error => {
        console.error("[RootLayout] prepareApp promise rejected:", error);
      });
    }
  }, [fontsLoaded, fontError, prepareApp]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      const prevState = appStateRef.current;

      if (prevState.match(/inactive|background/) && nextAppState === "active") {
        console.log("[RootLayout] App resumed from background");
        TokenManager.onAppForeground();

        // Only attempt token refresh if we're online
        const isOffline = store.getState().network?.isOffline ?? true;
        if (!isOffline) {
          try {
            await TokenManager.performTokenRefresh(router);
          } catch (error) {
            console.error("[RootLayout] Error during token refresh on resume:", error);
          }
        } else {
          console.log("[RootLayout] App resumed but offline, skipping token refresh");
        }
      } else if (nextAppState === "background" || nextAppState === "inactive") {
        console.log("[RootLayout] App going to background/inactive");
        TokenManager.onAppBackground();
        cleanupResponsiveManager();
      }

      appStateRef.current = nextAppState;
    };

    const appStateSubscription = AppState.addEventListener("change", handleAppStateChange);
    const networkUnsubscribe = checkOfflineStatus();

    return () => {
      appStateSubscription.remove();
      if (networkUnsubscribe) networkUnsubscribe();
    };
  }, [router]);

  // Handle navigation based on app state
  useEffect(() => {
    if (!appState.initializationComplete) {
      console.log("[RootLayout] Navigation deferred: initialization incomplete");
      return;
    }

    const {
      hasSeenOnboarding,
      isAuthenticated,
      hasQuickLoginEnabled,
      useGuestMode,
    } = appState;

    // Validate that all required states are resolved
    if (
      hasSeenOnboarding === null ||
      isAuthenticated === null ||
      hasQuickLoginEnabled === null
    ) {
      console.error("[RootLayout] CRITICAL: Essential states are null after initialization");
      router.replace("/(public)/login");
      return;
    }

    // Determine target route based on app state
    let targetRoute: AppRoute;

    if (!hasSeenOnboarding) {
      targetRoute = "/onboard";
    } else if (useGuestMode && isAuthenticated) {
      targetRoute = "/(guest)/guest-home";
    } else if (isAuthenticated) {
      targetRoute = "/(auth)/home";
    } else if (hasQuickLoginEnabled) {
      targetRoute = "/(public)/quick-login";
    } else {
      targetRoute = "/(public)/login";
    }

    console.log("[RootLayout] Navigation decision:", {
      onboarding: hasSeenOnboarding,
      authenticated: isAuthenticated,
      guestMode: useGuestMode,
      quickLogin: hasQuickLoginEnabled,
      target: targetRoute,
    });

    router.replace(targetRoute);
  }, [appState, router]);

  // Stack navigator configuration
  const stackNavigator = useMemo(
    () => (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(guest)" options={{ animation: "ios" }} />
        <Stack.Screen name="(public)" options={{ animation: "ios" }} />
        <Stack.Screen name="(auth)" options={{ animation: "none" }} />
        <Stack.Screen name="onboard" options={{ animation: "fade" }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    ),
    []
  );

  // Handle splash screen hiding
  const onLayoutRootView = useCallback(async () => {
    if (appState.initializationComplete && !splashHiddenRef.current) {
      try {
        console.log("[RootLayout] Hiding splash screen");
        await SplashScreen.hideAsync();
        splashHiddenRef.current = true;
        console.log("[RootLayout] Splash screen hidden successfully");
      } catch (error) {
        console.error("[RootLayout] Failed to hide splash screen:", error);
      }
    }
  }, [appState.initializationComplete]);

  // Show nothing until initialization is complete (splash screen remains visible)
  if (!appState.initializationComplete) {
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