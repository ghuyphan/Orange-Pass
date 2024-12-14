import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, TouchableWithoutFeedback } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ThemedButton } from '@/components/buttons/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { t } from '@/i18n';
import { useThemeColor } from '@/hooks/useThemeColor';
import { storage } from '@/utils/storage';
import { triggerSuccessHapticFeedback } from '@/utils/haptic';
import { Colors } from '@/constants/Colors';
import LOGO from '@/assets/svgs/orange-logo.svg';
import { WINDOW_WIDTH } from '@gorhom/bottom-sheet';
import ThemedReuseableSheet from '@/components/bottomsheet/ThemedReusableSheet';
import BottomSheet from '@gorhom/bottom-sheet';

// Define a type for features
type Feature = {
    icon: string;
    title: string;
    subtitle: string;
};

const OnBoardScreen = () => {
    const router = useRouter();
    const { currentTheme } = useTheme();
    const iconColor = useThemeColor({ light: Colors.light.icon, dark: Colors.dark.icon }, 'buttonBackground');
    const bottomSheetRef = useRef<BottomSheet>(null);
    const [isBottomSheetVisible, setBottomSheetVisible] = useState(false);

    // Array of features to display
    const features: Feature[] = [
        {
            icon: 'qrcode-scan',
            title: t('onboardingScreen.title1'),
            subtitle: t('onboardingScreen.subtitle1')
        },
        {
            icon: 'cloud-sync-outline',
            title: t('onboardingScreen.title2'),
            subtitle: t('onboardingScreen.subtitle2')
        },
        {
            icon: 'earth',
            title: t('onboardingScreen.title3'),
            subtitle: t('onboardingScreen.subtitle3')
        }
    ];

    const onFinish = () => {
        storage.set('hasSeenOnboarding', true);
        triggerSuccessHapticFeedback();
        router.replace('/login');
    };

    const onOpenTOS = () => {
        bottomSheetRef.current?.snapToIndex(0);
        // setBottomSheetVisible(true);
    };

    return (
        <ThemedView style={styles.container}>
            <View style={styles.topContainer}>
                <View style={styles.logoContainer}>
                    <LOGO width={WINDOW_WIDTH * 0.14} height={WINDOW_WIDTH * 0.14} />
                </View>
                <ThemedText type='title'>{t('onboardingScreen.title')}</ThemedText>
            </View>

            <View style={styles.contentContainer}>
                {features.map((feature, index) => (
                    <View key={index} style={styles.featureContainer}>
                        <MaterialCommunityIcons
                            name={feature.icon as any}
                            size={40}
                            color={iconColor}
                        />
                        <View style={styles.featureTextContainer}>
                            <ThemedText
                                type='defaultSemiBold'
                                style={styles.title}
                            >
                                {feature.title}
                            </ThemedText>
                            <ThemedText style={styles.subtitle}>
                                {feature.subtitle}
                            </ThemedText>
                        </View>
                    </View>
                ))}
            </View>

            <View style={styles.bottomContainer}>
                <MaterialCommunityIcons
                    name='account-multiple'
                    size={25}
                    color={iconColor}
                    style={styles.bottomIcon}
                />
                <View style={styles.termsContainer}>
                    <View style={styles.termsTextContainer}>
                        <ThemedText style={styles.termsText}>
                            {t('onboardingScreen.termsOfService.agreementPrefix')}
                        </ThemedText>
                        <TouchableWithoutFeedback hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={onOpenTOS}>
                            <ThemedText style={[styles.termsText, styles.highlightText]}>
                                {t('onboardingScreen.termsOfService.termsOfServiceLink')}
                            </ThemedText>
                        </TouchableWithoutFeedback>
                    </View>
                    <View style={styles.privacyPolicyTextContainer}>
                        <ThemedText style={styles.termsText}>
                            {t('onboardingScreen.termsOfService.privacyPolicyPrefix')}
                        </ThemedText>
                        <ThemedText style={[styles.termsText, styles.highlightText]}>
                            {t('onboardingScreen.termsOfService.privacyPolicyLink')}
                        </ThemedText>
                    </View>
                </View>

                <ThemedButton
                    label={t('onboardingScreen.finishButton')}
                    style={styles.button}
                    onPress={onFinish}
                />
            </View>
            <ThemedReuseableSheet
                // isVisible={shouldRenderSheet}
                ref={bottomSheetRef}
                title={t('homeScreen.manage')}
                // description="Choose an action"
                snapPoints={['23%']}
                actions={[
                    {
                        icon: 'pencil-outline',
                        iconLibrary: 'MaterialCommunityIcons',
                        text: t('homeScreen.edit'),
                        onPress: () => bottomSheetRef.current?.close(),
                    },
                    {
                        icon: 'delete-outline',
                        iconLibrary: 'MaterialCommunityIcons',
                        text: t('homeScreen.delete'),
                        onPress: () => {},
                    }
                ]}
            />
        </ThemedView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    topContainer: {
        marginTop: 105,
        gap: 20,
        alignItems: 'center'
    },
    logoContainer: {
        backgroundColor: '#FFF5E1',
        padding: 14,
        borderRadius: 20
    },
    contentContainer: {
        flex: 1,
        // marginTop: 60,
        justifyContent: 'center',
        gap: 40
    },
    featureContainer: {
        flexDirection: 'row',
        gap: 20,
        marginHorizontal: 30,
        alignItems: 'center',
    },
    featureTextContainer: {
        flexDirection: 'column',
        flex: 1,
        width: '100%'
    },
    title: {
        fontSize: 16,
    },
    subtitle: {
        fontSize: 14,
        opacity: 0.7,
        lineHeight: 20
    },
    bottomContainer: {
        paddingTop: 15,
        paddingBottom: 30,
        paddingHorizontal: 15,
        gap: 15,
        justifyContent: 'center',
    },
    bottomIcon: {
        alignSelf: 'center',
        marginBottom: -10
    },
    termsContainer: {
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    termsText: {
        fontSize: 12,
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    termsTextContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5
    },
    privacyPolicyTextContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5
    },
    highlightText: {
        color: '#FFC107',
        fontSize: 12,
        letterSpacing: 0.5,
        // fontWeight: 'bold'
        lineHeight: 20
    },
    button: {},
});

export default OnBoardScreen;