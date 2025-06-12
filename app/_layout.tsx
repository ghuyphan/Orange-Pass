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
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-get-random-values";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";

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

// Define possible navigation routes for type safety - Updated for SDK 52
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

// Token Management Class with SDK 52 fixes
class TokenManager {
  private static lastRefreshTime = 0;
  private static backgroundStartTime = 0;
  private static isRefreshing = false;

  static shouldRefreshToken(
    authToken: string | null,
    userID: string | null,
  ): boolean {
    if (
      !authToken ||
      !userID ||
      userID === GUEST_USER_ID ||
      this.isRefreshing
    ) {
      return false;
    }

    const now = Date.now();
    const timeSinceLastRefresh = now - this.lastRefreshTime;
    const backgroundDuration =
      this.backgroundStartTime > 0 ? now - this.backgroundStartTime : 0;

    return (
      timeSinceLastRefresh > TOKEN_REFRESH_THRESHOLD &&
      backgroundDuration > BACKGROUND_TIME_THRESHOLD
    );
  }

  // Fixed router typing for SDK 52
  static async performTokenRefresh(router: ReturnType<typeof useRouter>): Promise<boolean> {
    if (this.isRefreshing) {
      return true;
    }

    try {
      const authToken = await SecureStore.getItemAsync("authToken");
      const userID = await SecureStore.getItemAsync("userID");

      if (!this.shouldRefreshToken(authToken, userID)) {
        return true;
      }

      this.isRefreshing = true;

      const currentLastSynced = store.getState().auth.lastSynced;
      store.dispatch(
        setSyncStatus({
          isSyncing: true,
          lastSynced: currentLastSynced ?? undefined,
        }),
      );

      const success = await refreshAuthToken(authToken!);

      if (success) {
        this.lastRefreshTime = Date.now();
        store.dispatch(
          setSyncStatus({
            isSyncing: false,
            lastSynced: new Date().toISOString(),
          }),
        );
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
      store.dispatch(
        setSyncStatus({
          isSyncing: false,
          lastSynced: store.getState().auth.lastSynced ?? undefined,
        }),
      );
    }
  }

  // Fixed router typing for SDK 52
  private static async handleAuthFailure(router: ReturnType<typeof useRouter>): Promise<void> {
    try {
      await SecureStore.deleteItemAsync("authToken");
      await SecureStore.deleteItemAsync("userID");
      store.dispatch(clearAuthData());
      // Use push instead of replace for better navigation behavior in SDK 52
      router.push("/(public)/login");
    } catch (error) {
      console.error("[TokenManager] Error handling auth failure:", error);
    }
  }

  static onAppBackground(): void {
    this.backgroundStartTime = Date.now();
  }

  static onAppForeground(): void {
    this.backgroundStartTime = 0;
  }

  static reset(): void {
    this.lastRefreshTime = 0;
    this.backgroundStartTime = 0;
    this.isRefreshing = false;
  }
}

// Updated AppNavigator with SDK 52 improvements
function AppNavigator() {
  const stackNavigator = useMemo(
    () => (
      <Stack>
        <Stack.Screen
          name="(guest)"
          options={{
            headerShown: false,
            animation: "ios_from_right",
            // Updated animation types for SDK 52
          }}
        />
        <Stack.Screen
          name="(public)"
          options={{
            headerShown: false,
            animation: "ios_from_right",
          }}
        />
        <Stack.Screen
          name="(auth)"
          options={{
            headerShown: false,
            animation: "ios_from_right",
          }}
        />
        <Stack.Screen
          name="onboard"
          options={{
            headerShown: false,
            presentation: "modal",
          }}
        />
        {/* <Stack.Screen name="+not-found" /> */}
      </Stack>
    ),
    [],
  );

  return (
    <>
      {/* Updated StatusBar configuration for SDK 52 */}
      {/* <StatusBar
        // style="auto"
        style="dark"
        backgroundColor="transparent"
        translucent={true}
      /> */}
      {stackNavigator}
    </>
  );
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

  const initializationPromise = useRef<Promise<void> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const splashHiddenRef = useRef(false);
  // Add navigation ref to prevent multiple navigations
  const navigationInProgressRef = useRef(false);

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
      await Promise.all([createUserTable(), createQrTable()]);
    } catch (error) {
      console.error(
        "[RootLayout] Failed to initialize database tables:",
        error,
      );
      throw error;
    }
  }, []);

  // Check onboarding status
  const checkOnboardingStatus = useCallback(async (): Promise<boolean> => {
    try {
      const hasSeenOnboarding =
        storage.getBoolean(ONBOARDING_STORAGE_KEY) ?? false;
      return hasSeenOnboarding;
    } catch (error) {
      console.error("[RootLayout] Error reading onboarding status:", error);
      return false;
    }
  }, []);

  // Main app preparation function
  const prepareApp = useCallback(async (): Promise<void> => {
    if (initializationPromise.current) {
      return initializationPromise.current;
    }

    initializationPromise.current = (async () => {
      try {
        await initializeDatabase();

        const [onboardingStatus, quickLoginEnabled, guestModePreference] =
          await Promise.all([
            checkOnboardingStatus(),
            getQuickLoginStatus(),
            checkGuestModeStatus(),
          ]);

        const sessionActive = await checkInitialAuth(!onboardingStatus);

        setAppState({
          initializationComplete: true,
          isAuthenticated: sessionActive,
          hasSeenOnboarding: onboardingStatus,
          hasQuickLoginEnabled: quickLoginEnabled,
          useGuestMode: guestModePreference,
        });
      } catch (error) {
        console.error("[RootLayout] App preparation error:", error);
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
      prepareApp().catch((error) => {
        console.error("[RootLayout] App preparation failed:", error);
      });
    }
  }, [fontsLoaded, fontError, prepareApp]);

  // Handle app state changes with SDK 52 improvements
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      const prevState = appStateRef.current;

      if (prevState.match(/inactive|background/) && nextAppState === "active") {
        TokenManager.onAppForeground();

        const isOffline = store.getState().network?.isOffline ?? true;
        if (!isOffline) {
          try {
            await TokenManager.performTokenRefresh(router);
          } catch (error) {
            console.error("[RootLayout] Token refresh failed:", error);
          }
        }
      } else if (nextAppState === "background" || nextAppState === "inactive") {
        TokenManager.onAppBackground();
        cleanupResponsiveManager();
      }

      appStateRef.current = nextAppState;
    };

    const appStateSubscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
    const networkUnsubscribe = checkOfflineStatus();

    return () => {
      appStateSubscription?.remove();
      if (networkUnsubscribe) networkUnsubscribe();
    };
  }, [router]);

  // Handle navigation based on app state - Fixed for SDK 52
  useEffect(() => {
    if (!appState.initializationComplete || navigationInProgressRef.current) {
      return;
    }

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
        "[RootLayout] CRITICAL: Essential states are null after initialization",
      );
      navigationInProgressRef.current = true;
      router.push("/(public)/login");
      // Reset navigation flag after a delay
      setTimeout(() => {
        navigationInProgressRef.current = false;
      }, 1000);
      return;
    }

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

    // Prevent multiple navigation calls
    navigationInProgressRef.current = true;

    // Use push instead of replace for better navigation behavior in SDK 52
    router.push(targetRoute);

    // Reset navigation flag after a delay
    setTimeout(() => {
      navigationInProgressRef.current = false;
    }, 1000);
  }, [appState, router]);

  // Handle splash screen hiding
  const onLayoutRootView = useCallback(async () => {
    if (appState.initializationComplete && !splashHiddenRef.current) {
      try {
        await SplashScreen.hideAsync();
        splashHiddenRef.current = true;
      } catch (error) {
        console.error("[RootLayout] Failed to hide splash screen:", error);
      }
    }
  }, [appState.initializationComplete]);

  if (!appState.initializationComplete) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <ThemeProvider>
          <Provider store={store}>
            <GestureHandlerRootView style={styles.container}>
              <PaperProvider>
                <LocaleProvider>
                  <ThemedView style={styles.root} onLayout={onLayoutRootView}>
                    <AppNavigator />
                  </ThemedView>
                </LocaleProvider>
              </PaperProvider>
            </GestureHandlerRootView>
          </Provider>
        </ThemeProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
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