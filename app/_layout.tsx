import { useEffect, useState, useCallback } from 'react';
import { StyleSheet, UIManager, Platform, Dimensions, View } from 'react-native';
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
import { StatusBar } from 'expo-status-bar';
import { ThemedView } from '@/components/ThemedView';

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
            SplashScreen.hideAsync();
        }
    }, [isAppReady]);

    useEffect(() => {
        const prepareApp = async () => {
            try {
                await createTable();

                const onboardingStatus = storage.getBoolean('hasSeenOnboarding') ?? false;
                setHasSeenOnboarding(onboardingStatus);

                // Check authentication status *after* onboarding status is known
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
        // This effect now runs only once when all states are ready
        if (isAppReady && hasSeenOnboarding !== null && isAuthenticated !== null) {
            if (!hasSeenOnboarding) {
                router.replace('/onboard');
            } else if (isAuthenticated) {
                router.replace('/home');
            } else {
                router.replace('/login');
            }
        }
    }, [isAppReady, hasSeenOnboarding, isAuthenticated, router]); // Add router to dependency array

    if (!isAppReady || isAuthenticated === null || hasSeenOnboarding === null) {
        return null;
    }

    return (
        <ThemeProvider>
            <Provider store={store}>
                <GestureHandlerRootView>
                    <PaperProvider>
                        <LocaleProvider>
                            <ThemedView style={styles.root} onLayout={onLayoutRootView}>
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
                            </ThemedView>
                        </LocaleProvider>
                    </PaperProvider>
                </GestureHandlerRootView>
            </Provider>
        </ThemeProvider>
    );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
});