import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, View, Platform, useColorScheme, Switch } from 'react-native';
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

function SettingsScreen() {
    const [avatarConfig, setAvatarConfig] = useState<{ [key: string]: any } | null>(null);
    const colorScheme = useColorScheme();
    const color = colorScheme === 'light' ? Colors.light.text : Colors.dark.text;
    const scrollY = useSharedValue(0);
    const isOffline = useSelector((state: RootState) => state.network.isOffline);
    const userId = useSelector((state: RootState) => state.auth.user);

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
                bgColor: '#FFE4C4',
                faceColor: '#FFC0CB',
            });
            setAvatarConfig(newConfig);
            storage.set('avatarConfig', JSON.stringify(newConfig));
        }
    }, []);

    const onNavigateBack = useCallback(() => {
        router.back();
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
                <View style={styles.avatarContainer}>
                    {avatarConfig && <Avatar size={120} {...avatarConfig} />}
                </View>

                <View style={[styles.sectionContainer, { backgroundColor: colorScheme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground }]}>
                    <View style={styles.settingsContainer}>
                        <ThemedText style={styles.sectionTitle}>{t('settingsScreen.language')}</ThemedText>
                        <View style={styles.languageContainer}>
                            <ThemedText>English</ThemedText>
                            <Ionicons name="chevron-forward" size={20} color={color} />
                        </View>
                    </View>

                    <View style={styles.settingsContainer}>
                        <ThemedText style={styles.sectionTitle}>{t('settingsScreen.darkMode')}</ThemedText>
                        <Switch
                            thumbColor={'#fff'}
                        // trackColor={{ false: '#aaa', true: switchColor }}
                        // ios_backgroundColor={color}
                        // value={setting1Value}
                        // onValueChange={onSetting1Press}
                        />
                    </View>
                </View>
            </Animated.ScrollView>
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
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 15,
        marginBottom: 40,
    },
    sectionContainer: {
        borderRadius: 15,
        backgroundColor: 'white',
    },
    settingsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        paddingVertical: 15,
    },
    languageContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
});
