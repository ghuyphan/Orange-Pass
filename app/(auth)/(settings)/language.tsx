import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View, Platform, useColorScheme, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    Easing,
    interpolate,
    Extrapolation,
    useAnimatedScrollHandler
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { t } from '@/i18n';
import { Colors } from '@/constants/Colors';
import { useThemeColor } from '@/hooks/useThemeColor';
import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';
import GB from '@/assets/svgs/GB.svg';
import VN from '@/assets/svgs/VN.svg';
import { useLocale } from '@/context/LocaleContext';
import { useMMKVString } from 'react-native-mmkv';
import { storage } from '@/utils/storage';
import { Ionicons } from '@expo/vector-icons';
import * as Localization from 'expo-localization';

const LanguageScreen: React.FC = () => {
    const systemLocale = Localization.getLocales()[0].languageCode ?? 'en';
    const colors = useThemeColor({ light: Colors.light.text, dark: Colors.dark.text }, 'text');
    const colorScheme = useColorScheme();
    const [locale, setLocale] = useMMKVString('locale', storage);
    const scrollY = useSharedValue(0);
    
    const { updateLocale } = useLocale();

    // Màu nền chỉ được tính toán lại khi `colorScheme` thay đổi
    const sectionsColors = useMemo(() => (
        colorScheme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground
    ), [colorScheme]);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
    });

    const titleContainerStyle = useAnimatedStyle(() => {
        const translateY = interpolate(scrollY.value, [0, 140], [0, -35], Extrapolation.CLAMP);
        const opacity = withTiming(scrollY.value > 70 ? 0 : 1, {
            duration: 300,
            easing: Easing.out(Easing.ease),
        });
        return {
            opacity,
            transform: [{ translateY }],
            zIndex: scrollY.value > 50 ? 0 : 20,
        };
    });

    const onNavigateBack = useCallback(() => {
        router.back();
    }, []);

    const handleLanguageChange = useCallback((newLocale: string) => {
        updateLocale(newLocale); // Chỉ gọi `updateLocale`, không cần set trực tiếp vào MMKV
    }, [updateLocale]);
    
    const handleSystemLocale = useCallback(() => {
        updateLocale(systemLocale); // Tương tự, chỉ cập nhật qua context
    }, [updateLocale, systemLocale]);
    
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
            <Animated.ScrollView style={styles.scrollContainer} onScroll={scrollHandler}>
                <View style={[styles.sectionContainer, { backgroundColor: sectionsColors }]}>
                    <Pressable
                        android_ripple={{ color: 'rgba(0, 0, 0, 0.2)', foreground: true, borderless: false }}
                        onPress={() => handleLanguageChange('vi')}
                    >
                        <View style={styles.section}>
                            <View style={styles.leftSectionContainer}>
                                <View style={styles.flagIconContainer}>
                                    <VN width={35} height={35} />
                                </View>
                                <ThemedText>{t('languageScreen.vietnamese')}</ThemedText>
                            </View>
                            {locale === 'vi' && (
                                <Ionicons name="checkmark" size={20} color={colors} />
                            )}
                        </View>
                    </Pressable>

                    <Pressable
                        android_ripple={{ color: 'rgba(0, 0, 0, 0.2)', foreground: true, borderless: false }}
                        onPress={() => handleLanguageChange('en')}
                    >
                        <View style={styles.section}>
                            <View style={styles.leftSectionContainer}>
                                <View style={styles.flagIconContainer}>
                                    <GB width={35} height={35} />
                                </View>
                                <ThemedText>{t('languageScreen.english')}</ThemedText>
                            </View>
                            {locale === 'en' && (
                                <Ionicons name="checkmark" size={20} color={colors} />
                            )}
                        </View>
                    </Pressable>

                    <Pressable
                        android_ripple={{ color: 'rgba(0, 0, 0, 0.2)', foreground: true, borderless: false }}
                        onPress={handleSystemLocale}
                    >
                        <View style={styles.section}>
                            <View style={styles.leftSectionContainer}>
                                <View style={[
                                    styles.iconContainer,
                                    colorScheme === 'dark' ? { backgroundColor: Colors.dark.buttonBackground } : { backgroundColor: Colors.light.buttonBackground }
                                ]}>
                                    <Ionicons name="cog" size={20} color={colors} />
                                </View>
                                <ThemedText>{t('languageScreen.system')}</ThemedText>
                            </View>
                            {locale === undefined && (
                                <Ionicons name="checkmark" size={20} color={colors} />
                            )}
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
    section: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        pointerEvents: 'none',
    },
    leftSectionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
    },
    flagIconContainer: {
        width: 25,
        aspectRatio: 1,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    iconContainer: {
        padding: 5,
        borderRadius: 50,
        overflow: 'hidden',
    },
});
