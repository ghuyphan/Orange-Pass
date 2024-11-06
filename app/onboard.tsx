import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, Dimensions, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { ThemedTextButton } from '@/components/buttons/ThemedTextButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { t } from '@/i18n';
import { useThemeColor } from '@/hooks/useThemeColor';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';
import { storage } from '@/utils/storage';
import { triggerSuccessHapticFeedback } from '@/utils/haptic';
import { Colors } from 'react-native/Libraries/NewAppScreen';

const OnBoardScreen = () => {
    const color = useThemeColor({ light: '#5A4639', dark: '#FFF5E1' }, 'text');
    const iconColor = useThemeColor({ light: Colors.light.buttonBackground, dark: Colors.dark.buttonBackground }, 'buttonBackground');
    const pageIndicator = useThemeColor({ light: '#5A4639', dark: '#FFF5E14D' }, 'tabIconSelected');
    const router = useRouter();
    const scrollRef = useRef<ScrollView>(null);
    const [currentPage, setCurrentPage] = useState(0);

    // Reanimated shared values for animations
    const fadeValue = useSharedValue(0);
    const pulseValue = useSharedValue(1);

    // Icon pulse animation
    useEffect(() => {
        pulseValue.value = withRepeat(
            withTiming(1.1, { duration: 1000 }),
            -1,
            true
        );
    }, []);

    const handleNextPage = () => {
        const nextPage = currentPage + 1;
        fadeValue.value = 0; // Reset fade value
        scrollRef.current?.scrollTo({ x: nextPage * Dimensions.get('window').width, animated: true });
        setCurrentPage(nextPage);

        // Fade in the new content
        fadeValue.value = withTiming(1, { duration: 500 });
    };

    const onFinish = () => {
        storage.set('hasSeenOnboarding', true);
        triggerSuccessHapticFeedback();
        router.replace('/login');
    };

    const animatedFadeStyle = useAnimatedStyle(() => ({
        opacity: fadeValue.value,
    }));

    const animatedIconStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseValue.value }],
    }));

    return (
        <ThemedView style={styles.container}>
            <ThemedTextButton
                onPress={onFinish}
                style={styles.skipButton}
                label={t('onboardingScreen.skipButton')}
                textStyle={{fontSize: 16,}}
            />

            <ScrollView
                horizontal
                pagingEnabled
                scrollEnabled={false} // Disable user scrolling
                showsHorizontalScrollIndicator={false}
                ref={scrollRef}
                style={styles.scrollView}
                onLayout={() => {
                    fadeValue.value = withTiming(1, { duration: 500 }); // Initial fade-in
                }}
            >
                <Animated.View style={[styles.onboardingSection, animatedFadeStyle]}>
                    <Animated.View style={[styles.iconContainer, animatedIconStyle, { backgroundColor: iconColor }]}>
                        <Ionicons name="qr-code" size={75} color={color} />
                    </Animated.View>
                    <ThemedText style={styles.title} type='title'>
                        {t('onboardingScreen.title1')}
                    </ThemedText>
                    <ThemedText style={styles.subtitle}>
                        {t('onboardingScreen.subtitle1')}
                    </ThemedText>
                </Animated.View>

                <Animated.View style={[styles.onboardingSection, animatedFadeStyle]}>
                    <Animated.View style={[styles.iconContainer, animatedIconStyle, { backgroundColor: iconColor }]}>
                        <Ionicons name="cloud" size={75} color={color} />
                    </Animated.View>
                    <ThemedText style={styles.title} type='title'>
                        {t('onboardingScreen.title2')}
                    </ThemedText>
                    <ThemedText style={styles.subtitle}>
                        {t('onboardingScreen.subtitle2')}
                    </ThemedText>
                </Animated.View>

                <Animated.View style={[styles.onboardingSection, animatedFadeStyle]}>
                    <Animated.View style={[styles.iconContainer, animatedIconStyle, { backgroundColor: iconColor }]}>
                        <Ionicons name="globe" size={75} color={color} />
                    </Animated.View>
                    <ThemedText style={styles.title} type='title'>
                        {t('onboardingScreen.finishTitle')}
                    </ThemedText>
                    <ThemedText style={styles.subtitle}>
                        {t('onboardingScreen.finishSubtitle')}
                    </ThemedText>
                </Animated.View>
            </ScrollView>

            {/* Page Indicator */}
            <View style={styles.pageIndicatorContainer}>
                {[0, 1, 2].map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.pageDot, 
                            {   backgroundColor: pageIndicator,
                                opacity: currentPage === index ? 1 : 0.3,
                                width: currentPage === index ? 12 : 8, // Larger active dot
                                height: currentPage === index ? 12 : 8, // Larger active dot
                            }
                        ]}
                    />
                ))}
            </View>

            <View style={styles.bottomContainer}>
                {currentPage < 2 ? (
                    <ThemedButton label={t('onboardingScreen.nextButton')} style={styles.button1} onPress={handleNextPage} />
                ) : (
                    <ThemedButton label={t('onboardingScreen.finishButton')} style={styles.button1} onPress={onFinish} />
                )}
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
    onboardingSection: {
        width: width, // Adjust to the width of your screen
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 15,
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
        maxWidth: '80%',
    },
    pageIndicatorContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    pageDot: {
        // backgroundColor: '#5A4639',
        marginHorizontal: 5,
        borderRadius: 6,
    },
    bottomContainer: {
        paddingTop: 15,
        paddingBottom: 60,
        paddingHorizontal: 15,
        gap: 15,
    },
    button1: {},
    skipButton: {
        position: 'absolute',
        top: STATUSBAR_HEIGHT ,
        right: 15,
        zIndex: 10,
    },
});

export default OnBoardScreen;
