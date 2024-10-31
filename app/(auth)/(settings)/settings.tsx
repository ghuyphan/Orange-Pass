import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, View, Platform, useColorScheme, Switch } from 'react-native';
import { getLocales } from "expo-localization";
import { useSelector } from 'react-redux';
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
import { BlurView } from 'expo-blur';
import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import Avatar, { genConfig } from '@zamplyy/react-native-nice-avatar';
import { ThemedStatusToast } from '@/components/toast/ThemedOfflineToast';
import { t } from '@/i18n';
import { storage } from '@/utils/storage';
import { Colors } from '@/constants/Colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useMMKVBoolean } from 'react-native-mmkv';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import * as SecureStore from 'expo-secure-store';
import { useDispatch } from 'react-redux';
import { clearAuthData } from '@/store/reducers/authSlice';
import { ThemedModal } from '@/components/modals/ThemedIconModal';
import pb from '@/services/pocketBase';

function SettingsScreen() {
    const [avatarConfig, setAvatarConfig] = useState<{ [key: string]: any } | null>(null);
    const colorScheme = useColorScheme();
    const [isLoading, setIsLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const dispatch = useDispatch();

    const color = colorScheme === 'light' ? Colors.light.text : Colors.dark.text;
    const scrollY = useSharedValue(0);
    const isOffline = useSelector((state: RootState) => state.network.isOffline);
    const email = useSelector((state: RootState) => state.auth.user?.email ?? '-');
    const name = useSelector((state: RootState) => state.auth.user?.name ?? '-');
    const darkMode= useMMKVBoolean('quickScan', storage);
    const storedLocale = storage.getString("locale"); 
    const locale = getLocales()[0].languageCode ?? 'en';

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

    useEffect(() => {
        const savedConfig = storage.getString('avatarConfig');
        if (savedConfig) {
            setAvatarConfig(JSON.parse(savedConfig));
        } else {
            const newConfig = genConfig({
                bgColor: '#FFFFFF',
                faceColor: '#FFC0CB',
            });
            setAvatarConfig(newConfig);
            storage.set('avatarConfig', JSON.stringify(newConfig));
        }
    }, []);

    const onNavigateBack = useCallback(() => {
        router.back();
    }, [])

    const logout = async () => {
        try {
            setIsModalVisible(false);
            setIsLoading(true);
            await SecureStore.deleteItemAsync('authToken');
            dispatch(clearAuthData());
            pb.authStore.clear();
        } catch (error) {
            console.log(error);
        } finally {
            setTimeout(() => {
                setIsLoading(false);
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
                    <ThemedText type="title">{t('settingsScreen.title')}</ThemedText>
                </View>
            </Animated.View>
            <Animated.ScrollView contentContainerStyle={styles.scrollContainer} onScroll={scrollHandler}>
                <View style={[styles.avatarContainer, { backgroundColor: colorScheme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground }]}>
                    {avatarConfig && <Avatar size={60} {...avatarConfig} />}
                    <View style={styles.userContainer}>
                        <ThemedText type='defaultSemiBold' style={styles.userName}>{email}</ThemedText>
                        <ThemedText>{name ? name : '-'}</ThemedText>
                    </View>
                </View>

                <View style={[styles.sectionContainer, { backgroundColor: colorScheme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground }]}>
                    <TouchableWithoutFeedback>
                        <View style={styles.settingsContainer}>
                            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>{t('settingsScreen.language')}</ThemedText>
                            <View style={styles.languageContainer}>
                                <ThemedText style={styles.settingsText}>{locale? 'English' : 'Vietnamese'}</ThemedText>
                                <Ionicons name="chevron-forward" size={20} color={color} />
                            </View>
                        </View>
                    </TouchableWithoutFeedback>

                    <TouchableWithoutFeedback>
                        <View style={styles.settingsContainer}>
                            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>{t('settingsScreen.appTheme')}</ThemedText>
                            <View style={styles.languageContainer}>
                            <ThemedText style={styles.settingsText}>{darkMode !== undefined ? (darkMode ? 'Dark' : 'Light') : 'System'}</ThemedText>
                                <Ionicons name="chevron-forward" size={20} color={color} />
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
                <ThemedButton
                    iconName="log-out-outline"
                    label={t('settingsScreen.logout')}
                    loadingLabel='Logging out...'
                    loading={isLoading}
                    onPress={onLogout}

                />
            </Animated.ScrollView>
            <ThemedModal
                primaryActionText={t('settingsScreen.logout')}
                onPrimaryAction={logout}
                onSecondaryAction={() => setIsModalVisible(false)}
                secondaryActionText={t('settingsScreen.cancel')}
                title={t('settingsScreen.confirmLogoutTitle')}
                message={t('settingsScreen.confirmLogoutMessage')}
                isVisible={isModalVisible}
                iconName="log-out-outline"
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
    avatarContainer: {
        alignItems: 'center',
        flexDirection: 'row',
        paddingVertical: 10,
        paddingHorizontal: 15,
        marginBottom: 40,
        borderRadius: 10,
        gap: 10,
    },
    userContainer: {
        justifyContent: 'center',
        flexDirection: 'column',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 10,
        gap: 10,
    },
    userName: {
        fontSize: 18,
    },
    sectionContainer: {
        borderRadius: 10,
        backgroundColor: 'white',
        marginBottom: 20,
    },
    settingsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 16,
        paddingVertical: 15,
    },
    settingsText: {
        fontSize: 12,
    },
    languageContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
});
