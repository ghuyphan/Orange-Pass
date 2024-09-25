import React, { useRef, useState } from 'react';
import { StyleSheet, View, Dimensions, ScrollView, PermissionsAndroid, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { ThemedTextButton } from '@/components/buttons/ThemedTextButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useCameraPermission } from 'react-native-vision-camera';
import { t } from '@/i18n';
import { useUnmountBrightness } from '@reeq/react-native-device-brightness';

const PermissionScreen = () => {
    const { hasPermission: cameraPermission, requestPermission: requestCameraPermission } = useCameraPermission();
    const [step, setStep] = useState(1); // Step 1: Camera, Step 2: Location
    const color = useThemeColor({ light: '#5A4639', dark: '#FFF5E1' }, 'text');
    const iconColor = useThemeColor({ light: '#D3B08C', dark: '#7B524A' }, 'buttonBackground');
    const router = useRouter();
    const scrollRef = useRef<ScrollView>(null);
    
    const fadeValue = useSharedValue(1);
    const swipeValue = useSharedValue(0); // New value for the horizontal translation

    useUnmountBrightness(0.8, true);
    
    const requestLocationPermission = async () => {
        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    {
                        title: "Location Permission",
                        message:
                            "This app needs access to your location to scan nearby Wi-Fi networks.",
                        buttonNeutral: "Ask Me Later",
                        buttonNegative: "Cancel",
                        buttonPositive: "OK"
                    }
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            } catch (err) {
                console.warn(err);
                return false;
            }
        }
        return true; // Assuming iOS will handle permissions differently
    };

    const handleCombinedPermission = async () => {
        if (step === 1) {
            const result = await requestCameraPermission();
            if (result === true) {
                animateSwipeAndFade(() => {
                    setStep(2);
                    proceedToNextPage();
                });
            } else {
                console.log('Camera permission not granted');
            }
        } else if (step === 2) {
            const locationGranted = await requestLocationPermission();
            if (locationGranted) {
                router.navigate('/(auth)/(scan)/scan-main');
            } else {
                console.log('Location permission not granted');
            }
        }
    };

    const animateSwipeAndFade = (onAnimationEnd: () => void) => {
        const screenWidth = Dimensions.get('window').width;
        // Animate swipe and fade simultaneously
        swipeValue.value = withTiming(-screenWidth, { duration: 200 }, () => {
            // Trigger the state update after animation completes
            runOnJS(onAnimationEnd)();
        });
        fadeValue.value = withTiming(0, { duration: 200 });
    };

    const onDecline = () => {
        router.back();
    };

    const proceedToNextPage = () => {
        // Reset values after proceeding to the next page
        swipeValue.value = 0;
        fadeValue.value = withTiming(1, { duration: 500 });
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: swipeValue.value }],
        opacity: fadeValue.value,
    }));
    

    return (
        <ThemedView style={styles.container}>
            <ScrollView
                horizontal
                pagingEnabled
                scrollEnabled={false}
                showsHorizontalScrollIndicator={false}
                ref={scrollRef}
                style={styles.scrollView}
            >
                <Animated.View style={[styles.permissionSection, animatedStyle]}>
                    <View style={[styles.iconContainer, { backgroundColor: iconColor }]}>
                        <Ionicons name={step === 1 ? "camera" : "wifi"} size={75} color={color} />
                    </View>
                    <ThemedText style={styles.title} type="title">
                        {step === 1
                            ? t('permissionScreen.cameraTitle')
                            : t('permissionScreen.locationTitle')}
                    </ThemedText>
                    <ThemedText style={styles.subtitle}>
                        {step === 1
                            ? t('permissionScreen.cameraSubtitle')
                            : t('permissionScreen.locationSubtitle')}
                    </ThemedText>
                </Animated.View>
            </ScrollView>

            <View style={styles.bottomContainer}>
                <ThemedButton label={t('permissionScreen.allowButton')} onPress={handleCombinedPermission} />
                <ThemedTextButton label={t('permissionScreen.cancelButton')} onPress={onDecline} style={styles.button2} />
            </View>
        </ThemedView>
    );
};

const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
        flexGrow: 1,
    },
    permissionSection: {
        width: width,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    iconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
        borderRadius: 100,
        marginBottom: 20,
    },
    title: {
        textAlign: 'center',
        fontSize: 26,
        marginBottom: 8,
    },
    subtitle: {
        textAlign: 'center',
        fontSize: 18,
    },
    bottomContainer: {
        paddingBottom: 60,
        paddingHorizontal: 15,
        gap: 15,
    },
    button2: {
        alignSelf: 'center',
    },
});

export default PermissionScreen;
