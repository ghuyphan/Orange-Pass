import React, { useRef, useState } from 'react';
import { StyleSheet, View, Dimensions, ScrollView, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { ThemedTextButton } from '@/components/buttons/ThemedTextButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useCameraPermission } from 'react-native-vision-camera';
import { t } from '@/i18n';
import * as Brightness from 'expo-brightness';

const PermissionScreen = () => {
    const { hasPermission: cameraPermission, requestPermission: requestCameraPermission } = useCameraPermission();
    const [step, setStep] = useState(1); // Step 1: Camera, Step 2: Brightness
    const color = useThemeColor({ light: '#5A4639', dark: '#FFF5E1' }, 'text');
    const iconColor = useThemeColor({ light: '#D3B08C', dark: '#7B524A' }, 'buttonBackground');
    const router = useRouter();
    const scrollRef = useRef<ScrollView>(null);
    const fadeValue = useSharedValue(0);

    const handleCombinedPermission = async () => {
        if (step === 1) {
            const result = await requestCameraPermission();
            if (result === true) {
                setStep(2);
            } else {
                console.log('Camera permission not granted');
            }
        } else if (step === 2) {
            const { status } = await Brightness.requestPermissionsAsync();
            console.log(status);
            if (status === 'granted') {
                router.replace('/(scan)/scan-main');
            } else {
                console.log('Brightness permission not granted');
            }
        }
    };

    const proceedToNextPage = () => {
        fadeValue.value = 0;
        scrollRef.current?.scrollTo({ x: Dimensions.get('window').width, animated: true });
        fadeValue.value = withTiming(1, { duration: 500 }); 
        if (step === 3) {
            console.log('Permission granted');
        }
    };

    const animatedFadeStyle = useAnimatedStyle(() => ({
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
                onLayout={() => {
                    fadeValue.value = withTiming(1, { duration: 500 });
                }}
            >
                <Animated.View style={[styles.permissionSection, animatedFadeStyle]}>
                    <View style={[styles.iconContainer, { backgroundColor: iconColor }]}>
                        <Ionicons name={step === 1 ? "camera" : "sunny"} size={75} color={color} />
                    </View>
                    <ThemedText style={styles.title} type="title">
                        {step === 1
                            ? t('permissionScreen.cameraTitle')
                            : t('permissionScreen.brightnessTitle')}
                    </ThemedText>
                    <ThemedText style={styles.subtitle}>
                        {step === 1
                            ? t('permissionScreen.cameraSubtitle')
                            : t('permissionScreen.brightnessSubtitle')}
                    </ThemedText>

                </Animated.View>
            </ScrollView>

            <View style={styles.bottomContainer}>
                <ThemedButton label={t('permissionScreen.allowButton')} onPress={handleCombinedPermission} />
                <ThemedTextButton label={t('permissionScreen.cancelButton')} onPress={() => router.back()} style={styles.button2} />
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
