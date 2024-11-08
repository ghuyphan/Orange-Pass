import { useEffect, useState, useMemo } from 'react';
import { Image, StyleSheet, UIManager, Platform, Dimensions, ActivityIndicator, StatusBar } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from '@/hooks/useColorScheme';
import { checkInitialAuth } from '@/services/auth';
import { checkOfflineStatus } from '@/services/network';
import { store } from '@/store';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Colors } from '@/constants/Colors';
import { PaperProvider } from 'react-native-paper';
import { createTable } from '@/services/localDB/userDB';
import { storage } from '@/utils/storage';
import { useMMKVBoolean } from 'react-native-mmkv';
import { ThemedView } from '@/components/ThemedView';
import { LocaleProvider } from '@/context/LocaleContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const systemColorScheme = useColorScheme();
  const [darkMode, setDarkMode] = useState<boolean | null>(null);
  const [themeLoaded, setThemeLoaded] = useState(false);
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [isAppReady, setIsAppReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  const router = useRouter();

  if (Platform.OS === 'android') {
    UIManager.setLayoutAnimationEnabledExperimental?.(true);
  }

  // Load theme from MMKV storage
  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = storage.getBoolean('dark-mode');
      setDarkMode(savedTheme !== undefined ? savedTheme : null);
      setThemeLoaded(true);
    };
    loadTheme();
  }, []);

  useEffect(() => {
    console.log('Dark mode:', darkMode);
  }, [darkMode]);

  useEffect(() => {
    const prepareApp = async () => {
      try {
        await createTable();

        const onboardingStatus = storage.getBoolean('hasSeenOnboarding') ?? false;
        setHasSeenOnboarding(onboardingStatus);

        if (onboardingStatus) {
          const authStatus = await checkInitialAuth();
          setIsAuthenticated(authStatus);
        } else {
          setIsAuthenticated(false);
        }

        if (fontsLoaded) {
          setIsAppReady(true);
        }
      } catch (error) {
        console.error("Error during app initialization:", error);
      } finally {
        await SplashScreen.hideAsync();
      }
    };

    if (fontsLoaded) {
      prepareApp();
    }

    const unsubscribe = checkOfflineStatus();
    return () => unsubscribe();
  }, [fontsLoaded]);

  useEffect(() => {
    if (isAppReady && hasSeenOnboarding !== null && isAuthenticated !== null) {
      if (!hasSeenOnboarding) {
        router.replace('/onboard');
      } else if (isAuthenticated) {
        router.replace('/home');
      } else {
        router.replace('/login');
      }
    }
  }, [isAppReady, hasSeenOnboarding, isAuthenticated]);

  // Memoize the current theme
  const currentTheme = useMemo(() => {
    if (darkMode !== null) {
      return darkMode ? DarkTheme : DefaultTheme;
    }
    return systemColorScheme === 'dark' ? DarkTheme : DefaultTheme;
  }, [darkMode, systemColorScheme]);

  if (!themeLoaded) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color='#8FCB8F' />
      </ThemedView>
    );
  }

  if (!isAppReady || isAuthenticated === null || hasSeenOnboarding === null) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <Image resizeMode='contain' source={require('@/assets/images/orange-icon.png')} style={styles.orangeLogo} />
        <ActivityIndicator style={styles.activityIndicator} size="small" color='#8FCB8F' />
      </ThemedView>
    );
  }

  return (
    <Provider store={store}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PaperProvider>
          <LocaleProvider>
            <ThemeProvider value={currentTheme}>
              <ThemedView style={{ flex: 1 }}>
                <StatusBar
                  barStyle={darkMode !== null
                    ? (darkMode ? 'light-content' : 'dark-content')
                    : (systemColorScheme === 'dark' ? 'light-content' : 'dark-content')}
                />
                <Stack screenOptions={{ headerShown: false, animation: 'ios' }}>
                  <Stack.Screen name="(public)" />
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="+not-found" />
                  <Stack.Screen name="onboard" options={{ animation: 'none' }} />
                </Stack>
              </ThemedView>
            </ThemeProvider>
          </LocaleProvider>
        </PaperProvider>
      </GestureHandlerRootView>
    </Provider>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orangeLogo: {
    height: height * 0.15,
    width: width * 0.28,
  },
  activityIndicator: {
    position: 'absolute',
    bottom: 85,
  },
});
