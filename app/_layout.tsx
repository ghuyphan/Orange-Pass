import { useEffect, useState } from 'react';
import { Image, StyleSheet, View, UIManager, Platform, Dimensions, ActivityIndicator } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
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

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const systemColorScheme = useColorScheme();  // Use system color scheme
  const [dark, setDark] = useMMKVBoolean('dark-mode', storage);
  // const [seenOnboard] = useMMKVBoolean('hasSeenOnboarding', storage);
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [isAppReady, setIsAppReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  const router = useRouter();

  if (Platform.OS === 'android') {
    UIManager.setLayoutAnimationEnabledExperimental &&
      UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  useEffect(() => {
    const prepareApp = async () => {
      try {
        await createTable();
        await SplashScreen.hideAsync();

        // Check onboarding status first
        let onboardingStatus = storage.getBoolean('hasSeenOnboarding');
        if (onboardingStatus === undefined) {
          onboardingStatus = false; // Default to false if undefined (user hasn't seen onboarding)
        }
        setHasSeenOnboarding(onboardingStatus);

        // If onboarding has been seen, check auth status
        if (onboardingStatus) {
          const authStatus = await checkInitialAuth();
          setIsAuthenticated(authStatus);
        } else {
          // Skip auth check if onboarding hasn't been seen
          setIsAuthenticated(false);
        }

      } catch (error) {
        console.error("Error during app initialization:", error);
      } finally {
        if (fontsLoaded) {
          setIsAppReady(true);
        }
      }
    };

    if (fontsLoaded) {
      prepareApp();
    }

    const unsubscribe = checkOfflineStatus();
    return () => {
      unsubscribe();
    };
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

  // Delay rendering the stack until the app is ready and status checks are done
  if (!isAppReady || isAuthenticated === null || hasSeenOnboarding === null) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <Image resizeMode='contain' source={require('@/assets/images/orange-icon.png')} style={styles.orangeLogo} />
        <ActivityIndicator style={styles.activityIndicator} size="small" color='##8FCB8F' />
      </ThemedView>
    );
  }

  return (
    <Provider store={store}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PaperProvider>
          {/* ThemeProvider logic updated */}
          <ThemeProvider
            value={
              dark !== undefined ?
                (dark ? DarkTheme : DefaultTheme) :
                (systemColorScheme === 'dark' ? DarkTheme : DefaultTheme)
            }
          >
            <ThemedView style={{ flex: 1 }}>
              <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
                <Stack.Screen name="(public)" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="+not-found" />
                <Stack.Screen name="onboard" options={{ animation: 'none' }} />
              </Stack>
            </ThemedView>
          </ThemeProvider>
        </PaperProvider>
      </GestureHandlerRootView>
    </Provider>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orangeLogo: {
    justifyContent: 'center',
    alignItems: 'center',
    height: height * 0.15,
    width: width * 0.28,
    // aspectRatio: 1,
  },
  activityIndicator: {
    position: 'absolute',
    bottom: 85,
    left: 0,
    right: 0,
  },
});
