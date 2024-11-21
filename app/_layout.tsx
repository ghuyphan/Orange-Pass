import { useEffect, useState, useCallback } from 'react';
import { StyleSheet, UIManager, Platform, Dimensions, ActivityIndicator, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { store } from '@/store';
import { createTable } from '@/services/localDB/userDB';
import { checkInitialAuth } from '@/services/auth';
import { checkOfflineStatus } from '@/services/network';
import { LocaleProvider } from '@/context/LocaleContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { storage } from '@/utils/storage';
import LOGO from '@/assets/svgs/orange-logo.svg';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        'HelveticaNeue-Bold': require('../assets/fonts/HelveticaNeueBold.ttf'),
    });

    const [isAppReady, setIsAppReady] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
    const router = useRouter();

    // Enable layout animation on Android
    if (Platform.OS === 'android') {
        UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
    const onLayoutRootView = useCallback(() => {
        if (isAppReady) {
          // This tells the splash screen to hide immediately! If we call this after
          // `setAppIsReady`, then we may see a blank screen while the app is
          // loading its initial state and rendering its first pixels. So instead,
          // we hide the splash screen once we know the root view has already
          // performed layout.
          SplashScreen.hideAsync();
        }
      }, [isAppReady]);

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
        }
    };

    prepareApp();

    const unsubscribe = checkOfflineStatus();
    return () => unsubscribe();
}, [fontsLoaded]);

useEffect(() => {
    if (isAppReady && hasSeenOnboarding !== null && isAuthenticated !== null) {
        // Navigate to the appropriate screen
        if (!hasSeenOnboarding) {
            router.replace('/onboard');
        } else if (isAuthenticated) {
            router.replace('/home');
        } else {
            router.replace('/login');
        }
    }
}, [isAppReady, hasSeenOnboarding, isAuthenticated]);

if (!isAppReady || isAuthenticated === null || hasSeenOnboarding === null) {
    return null;
}

return (
    <Provider store={store}>
        <GestureHandlerRootView onLayout={onLayoutRootView}>
            <PaperProvider>
                <LocaleProvider>
                    <ThemeProvider>
                        <Stack
                            screenOptions={{
                                headerShown: false,
                                animation: 'ios',
                            }}
                        >
                            <Stack.Screen
                                name="(public)"
                            />
                            <Stack.Screen
                                name="(auth)"
                                options={{
                                  animation: 'none',
                                }}
                            />
                            <Stack.Screen
                                name="+not-found"
                            />
                            <Stack.Screen
                                name="onboard"
                            />
                        </Stack>
                    </ThemeProvider>
                </LocaleProvider>
            </PaperProvider>
        </GestureHandlerRootView>
    </Provider>
);
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#FFF5E1',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF5E1',
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