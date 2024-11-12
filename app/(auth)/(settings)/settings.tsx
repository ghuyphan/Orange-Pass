import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Platform, useColorScheme } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';
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
import Avatar from '@zamplyy/react-native-nice-avatar';
import { ThemedSettingsCardItem } from '@/components/cards/ThemedSettingsCard';
import { ThemedModal } from '@/components/modals/ThemedIconModal';

import { t } from '@/i18n';
import { storage } from '@/utils/storage';
import { Colors } from '@/constants/Colors';
import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';
import { clearAuthData } from '@/store/reducers/authSlice';
import pb from '@/services/pocketBase';
import { useMMKVBoolean } from 'react-native-mmkv';
import { useLocale } from '@/context/LocaleContext';
import { useMMKVString } from 'react-native-mmkv';
import { ActivityIndicator } from 'react-native-paper';


function SettingsScreen() {
    const { updateLocale } = useLocale();
    const [locale, setLocale] = useMMKVString('locale', storage);
    const avatarConfigString = useSelector((state: RootState) => state.auth.user?.avatar ?? '');
    const [avatarConfig, setAvatarConfig] = useState<{ [key: string]: any } | null>(null);

    useEffect(() => {
        let parsedConfig;
    
        // Check if avatarConfigString is already an object
        if (typeof avatarConfigString === 'string') {
            try {
                parsedConfig = JSON.parse(avatarConfigString);
            } catch (error) {
                console.error("Error parsing avatar config:", error);
                parsedConfig = null;
            }
        } else if (typeof avatarConfigString === 'object' && avatarConfigString !== null) {
            // If it's already an object, directly assign it
            parsedConfig = avatarConfigString;
        }
    
        setAvatarConfig(parsedConfig || null);
    }, [avatarConfigString]);

    // const [avatarConfig, setAvatarConfig] = useState<{ [key: string]: any } | null>(null);
    const colorScheme = useColorScheme();
    const [isLoading, setIsLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const dispatch = useDispatch();

    const scrollY = useSharedValue(0);
    const email = useSelector((state: RootState) => state.auth.user?.email ?? '-');
    const name = useSelector((state: RootState) => state.auth.user?.name ?? '-');

    const [darkMode, setDarkMode] = useMMKVBoolean('dark-mode', storage);
    // const [locale, setLocale] = useMMKVString('locale', storage);

    const sectionsColors = colorScheme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground

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
    }, [])

    const logout = async () => {
        try {
            setIsModalVisible(false);
            setIsLoading(true);
            await SecureStore.deleteItemAsync('authToken');
            pb.authStore.clear();
        } catch (error) {
            console.log(error);
        } finally {
            setTimeout(() => {
                setIsLoading(false);
                dispatch(clearAuthData());
                router.replace('/login');
            }, 1000);
        }
    }

    const onLogout = useCallback(() => {
        setIsModalVisible(true);
    }, [])

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
                    <ThemedText style={styles.title} type="title">{t('settingsScreen.title')}</ThemedText>
                </View>
            </Animated.View>
            <Animated.ScrollView contentContainerStyle={styles.scrollContainer} onScroll={scrollHandler}>
                <View style={[styles.avatarContainer, { backgroundColor: sectionsColors }]}>
                    <LinearGradient
                        colors={['#6ac3ff', '#8a94ff', '#c87cff']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.gradient}
                    >
                        {avatarConfig ? (
                            <Avatar size={45} {...avatarConfig} />
                        ) : (
                            <View style={styles.avatarLoadContainer}>
                                <ActivityIndicator size={10} color="white" />
                            </View>
                        )}
                    </LinearGradient>
                    <View style={styles.userContainer}>
                        <ThemedText numberOfLines={1} style={styles.userEmail}>{name ? name : '-'}</ThemedText>
                        <ThemedText numberOfLines={1} style={styles.userName}>{email ? email : '-'}</ThemedText>
                    </View>
                </View>

                <View style={[styles.sectionContainer, { backgroundColor: colorScheme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground }]}>
                    <ThemedSettingsCardItem
                        leftIcon='person'
                        settingsTitle='Edit Profile'
                    // onPress={() => router.push('/settings/language')}
                    />
                    <ThemedSettingsCardItem
                        settingsTitle='Change Password'
                        leftIcon='lock-closed'
                    // onPress={() => router.push('/settings/language')}
                    />
                    <ThemedSettingsCardItem
                        settingsTitle='Change Email Address'
                        leftIcon='mail'
                    // onPress={() => router.push('/settings/language')}
                    />
                </View>

                <View style={[styles.sectionContainer, { backgroundColor: colorScheme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground }]}>
                    <ThemedSettingsCardItem
                        settingsTitle='About Orange⁺'
                        leftIcon='information-circle'
                    // onPress={() => router.push('/settings/language')}
                    />
                    <ThemedSettingsCardItem
                        settingsTitle={t('settingsScreen.language')}
                        leftIcon='language'
                        onPress={() => router.push('/language')}
                    />
                    <ThemedSettingsCardItem
                        settingsTitle={t('settingsScreen.appTheme')}
                        leftIcon='contrast'
                        onPress={() => router.push('/theme')}
                    />
                </View>
                <ThemedButton
                    iconName="log-out"
                    label={t('settingsScreen.logout')}
                    loadingLabel='Logging out...'
                    loading={isLoading}
                    onPress={onLogout}

                />
            </Animated.ScrollView>
            <ThemedModal
                dismissable={true}
                primaryActionText={t('settingsScreen.logout')}
                onPrimaryAction={logout}
                onSecondaryAction={() => setIsModalVisible(false)}
                secondaryActionText={t('settingsScreen.cancel')}
                title={t('settingsScreen.confirmLogoutTitle')}
                message={t('settingsScreen.confirmLogoutMessage')}
                isVisible={isModalVisible}
                iconName="log-out"
            />
        </ThemedView>
    );
}

export default React.memo(SettingsScreen);

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
    titleButton: {
        zIndex: 11,
    },
    title: {
        fontSize: 28,
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
    gradient: {
        borderRadius: 50, // Make it circular
        justifyContent: 'center',
        alignItems: 'center',
        padding: 5, // Optional: Add padding if needed
    },
    avatarContainer: {
        alignItems: 'center',
        flexDirection: 'row',
        paddingVertical: 10,
        paddingHorizontal: 15,
        marginBottom: 30,
        borderRadius: 10,
        gap: 0,
    },
    avatarLoadContainer: {
        width: 45,
        aspectRatio: 1,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    userContainer: {
        justifyContent: 'center',
        flexDirection: 'column',
        paddingHorizontal: 15,
        borderRadius: 10,
        maxWidth: '80%',
        overflow: 'hidden',
    },
    userEmail: {
        fontSize: 18,
    },
    userName: {
        opacity: 0.5,
        fontSize: 13.5,
        width: '100%',
    },
    sectionContainer: {
        borderRadius: 10,
        backgroundColor: 'white',
        marginBottom: 30,
        gap: 5,
        overflow: 'hidden',
    },
    settingsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
    },
    sectionTitle: {
        fontSize: 16,
        paddingVertical: 15,
    },
    settingsText: {
        fontSize: 16,
        opacity: 0.7,
    },
    languageContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
});
