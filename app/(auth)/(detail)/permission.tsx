import React, { useRef } from 'react';
import { StyleSheet, View, Dimensions, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { ThemedTextButton } from '@/components/buttons/ThemedTextButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { t } from '@/i18n';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';

const PermissionScreen = () => {
    const { hasPermission, requestPermission } = useCameraPermission();
    const color = useThemeColor({ light: '#5A4639', dark: '#FFF5E1' }, 'text');
    const iconColor = useThemeColor({ light: '#D3B08C', dark: '#7B524A' }, 'buttonBackground');
    const router = useRouter();
    const scrollRef = useRef<ScrollView>(null);
    const fadeValue = useSharedValue(0);

    const handlePermissionGranted = () => {
        fadeValue.value = 0;
        scrollRef.current?.scrollTo({ x: Dimensions.get('window').width, animated: true });
        if (!hasPermission) {
            requestPermission();
        } 
        fadeValue.value = withTiming(1, { duration: 500 });
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
                    fadeValue.value = withTiming(1, { duration: 500 }); // Initial fade-in
                }}
            >
                <Animated.View style={[styles.permissionSection, animatedFadeStyle]}>
                    <View style={[styles.iconContainer, { backgroundColor: iconColor }]}>
                        <Ionicons name="camera" size={75} color={color} />
                    </View>
                    <ThemedText style={styles.title} type='title'>
                        {t('permissionScreen.title')}
                    </ThemedText>
                    <ThemedText style={styles.subtitle}>
                        {t('permissionScreen.subtitle')}
                    </ThemedText>
                </Animated.View>

                <Animated.View style={[styles.permissionSection, animatedFadeStyle]}>
                    {/* Storage permission section or other parts */}
                    <View style={[styles.iconContainer, { backgroundColor: iconColor }]}>
                        <Ionicons name="folder" size={75} color={color} />
                    </View>
                    <ThemedText style={styles.title} type='title'>
                        {t('permissionScreen.storageTitle')}
                    </ThemedText>
                    <ThemedText style={styles.subtitle}>
                        {t('permissionScreen.storageSubtitle')}
                    </ThemedText>
                </Animated.View>
            </ScrollView>

            <View style={styles.bottomContainer}>
                <ThemedButton label={t('permissionScreen.allowButton')} style={styles.button1} onPress={handlePermissionGranted} />
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
        width: width, // Adjust to the width of your screen
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
        paddingVertical: 20,
        paddingHorizontal: 15,
        gap: 15,
    },
    button1: {
    },
    button2: {
        alignSelf: 'center',
    },
});

export default PermissionScreen;
