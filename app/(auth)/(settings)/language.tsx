import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Platform, useColorScheme, Pressable } from 'react-native';
import { getLocales } from "expo-localization";
import { useSelector, useDispatch } from 'react-redux';
import { BlurView } from 'expo-blur';

import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    Easing,
    useDerivedValue,
    interpolate,
    Extrapolation,
    useAnimatedScrollHandler
} from 'react-native-reanimated';

import { router } from 'expo-router';

import { RootState } from '@/store/rootReducer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedButton } from '@/components/buttons/ThemedButton';

import { t, changeLocale } from '@/i18n';
import { storage } from '@/utils/storage';
import { Colors } from '@/constants/Colors';
import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';
import { useMMKVBoolean } from 'react-native-mmkv';
import GB from '@/assets/svgs/GB.svg';
import VN from '@/assets/svgs/VN.svg';

function LanguageScreen() {
    const [locale, setLocale] = useState(storage.getString("locale") || getLocales()[0].languageCode || 'en');
    const colorScheme = useColorScheme();

    const scrollY = useSharedValue(0);
    const sectionsColors = colorScheme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground;

    const scrollHandler = useAnimatedScrollHandler((event) => {
        scrollY.value = event.contentOffset.y;
    });

    const translateY = useDerivedValue(() => {
        return interpolate(scrollY.value, [0, 140], [0, -35], Extrapolation.CLAMP);
    });

    const opacity = useDerivedValue(() => {
        return withTiming(scrollY.value > 70 ? 0 : 1, {
            duration: 300,
            easing: Easing.out(Easing.ease),
        });
    });

    const titleContainerStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
            transform: [{ translateY: translateY.value }],
            zIndex: (scrollY.value > 50) ? 0 : 20,
        };
    });

    const onNavigateBack = useCallback(() => {
        router.back();
    }, []);

    const handleLanguageChange = (newLocale: string) => {
        changeLocale(newLocale); // Cập nhật ngôn ngữ trong i18n
        setLocale(newLocale);    // Cập nhật state để render lại giao diện
    };

    return (
        <ThemedView style={styles.container}>
            {Platform.OS === 'android' ? (
                <ThemedView style={styles.blurContainer} />
            ) : (
                <BlurView intensity={10} style={styles.blurContainer} />
            )}
            <Animated.View style={[styles.titleContainer, titleContainerStyle]} pointerEvents="auto">
                <View style={styles.headerContainer}>
                    <View style={styles.titleButtonContainer}>
                        <ThemedButton
                            iconName="chevron-back"
                            style={styles.titleButton}
                            onPress={onNavigateBack}
                        />
                    </View>
                    <ThemedText style={styles.title} type="title">{t('languageScreen.title')}</ThemedText>
                </View>
            </Animated.View>
            <Animated.ScrollView contentContainerStyle={styles.scrollContainer} onScroll={scrollHandler}>
                <View style={[styles.sectionContainer, { backgroundColor: sectionsColors }]}>
                    <Pressable
                        android_ripple={{ color: 'rgba(0, 0, 0, 0.2)', foreground: true, borderless: false }}
                        onPress={() => handleLanguageChange('vi')}
                    >
                        <View style={styles.leftSectionContainer}>
                            <View style={styles.flagIconContainer}>
                                <VN width={35} height={35} />
                            </View>
                            <ThemedText>{t('languageScreen.vietnamese')}</ThemedText>
                        </View>
                    </Pressable>

                    <Pressable
                        android_ripple={{ color: 'rgba(0, 0, 0, 0.2)', foreground: true, borderless: false }}
                        onPress={() => handleLanguageChange('en')}
                    >
                        <View style={styles.leftSectionContainer}>
                            <View style={styles.flagIconContainer}>
                                <GB width={35} height={35} />
                            </View>
                            <ThemedText>{t('languageScreen.english')}</ThemedText>
                        </View>
                    </Pressable>
                </View>
            </Animated.ScrollView>
        </ThemedView>
    );
}

export default React.memo(LanguageScreen);

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    titleContainer: {
        position: 'absolute',
        top: STATUSBAR_HEIGHT + 25,
        left: 0,
        right: 0,
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        gap: 15,
    },
    titleButtonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    title: {
        fontSize: 28,
    },
    titleButton: {
        zIndex: 11,
    },
    blurContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: STATUSBAR_HEIGHT,
        zIndex: 10,
    },
    scrollContainer: {
        flexGrow: 1,
        paddingHorizontal: 15,
        paddingTop: STATUSBAR_HEIGHT + 105,
    },
    sectionContainer: {
        gap: 5,
        borderRadius: 10,
        overflow: 'hidden',
    },
    leftSectionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 15,
        paddingVertical: 10
    },
    flagIconContainer: {
        width: 25,
        aspectRatio: 1,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
});
