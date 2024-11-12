import { useEffect, useState, useCallback } from 'react';
import { Image, StyleSheet, UIManager, Platform, Dimensions, ActivityIndicator, View } from 'react-native';
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

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    });
    const [isAppReady, setIsAppReady] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
    const router = useRouter();

    // Enable layout animation on Android
    if (Platform.OS === 'android') {
        UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }

    const onLayoutRootView = useCallback(async () => {
        if (isAppReady) {
            try {
                // Add a small delay to ensure the new screen is ready
                await new Promise(resolve => setTimeout(resolve, 50));
                await SplashScreen.hideAsync();
            } catch (error) {
                console.error("Error hiding splash screen:", error);
            }
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
        return (
            <View style={styles.loadingContainer} onLayout={onLayoutRootView}>
                <Image 
                    resizeMode='contain' 
                    source={require('@/assets/images/orange-icon.png')} 
                    style={styles.orangeLogo} 
                />
                <ActivityIndicator 
                    style={styles.activityIndicator} 
                    size="small" 
                    color='#8FCB8F' 
                />
            </View>
        );
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
                                    animation: 'none',
                                }}
                            >
                                <Stack.Screen 
                                    name="(public)"
                                    options={{
                                        contentStyle: { backgroundColor: '#FFF5E1' }
                                    }}
                                />
                                <Stack.Screen 
                                    name="(auth)"
                                    options={{
                                        contentStyle: { backgroundColor: '#FFF5E1' }
                                    }}
                                />
                                <Stack.Screen 
                                    name="+not-found"
                                    options={{
                                        contentStyle: { backgroundColor: '#FFF5E1' }
                                    }}
                                />
                                <Stack.Screen 
                                    name="onboard"
                                    options={{
                                        contentStyle: { backgroundColor: '#FFF5E1' }
                                    }}
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