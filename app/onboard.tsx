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

// Type for bottom sheet types
type SheetType = 'tos' | 'privacy' | null;

const OnBoardScreen = () => {
    const router = useRouter();
    const { currentTheme } = useTheme();
    const iconColor = useThemeColor({ light: Colors.light.icon, dark: Colors.dark.icon }, 'buttonBackground');
    const cardColor = useThemeColor({ light: Colors.light.cardBackground, dark: Colors.dark.cardBackground }, 'buttonBackground');
    const bottomSheetRef = useRef<BottomSheet>(null);
    const [sheetType, setSheetType] = useState<SheetType>(null);

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

    const onOpenSheet = (type: SheetType) => {
        setSheetType(type);
        bottomSheetRef.current?.snapToIndex(0);
    };

    const onCloseSheet = () => {
        bottomSheetRef.current?.close();
        setSheetType(null);
    };

    const renderSheetContent = () => {
        switch (sheetType) {
            case 'tos':
                return (
                    <View style={styles.sheetContentContainer}>
                        <View style={[styles.sectionContainer, { backgroundColor: cardColor }]}>
                            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                                {t('onboardingScreen.termsOfService.termsOfServiceTitle')} 🚀
                            </ThemedText>
                            <ThemedText style={styles.sectionText}>
                                {t('onboardingScreen.termsOfService.termsOfServiceContent1')}
                            </ThemedText>
                        </View>
                        <View style={[styles.sectionContainer, { backgroundColor: cardColor }]}>
                            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                                {t('onboardingScreen.termsOfService.termsOfServiceDescription')} 📋
                            </ThemedText>
                            <View style={styles.bulletContainer}>
                                {t('onboardingScreen.termsOfService.termsOfServiceContent2').split('\n').map((bullet, index) => (
                                    bullet.trim().startsWith('*') && (
                                        <View key={index} style={styles.bulletPoint}>
                                            <ThemedText style={styles.bulletIcon}>•</ThemedText>
                                            <ThemedText style={styles.bulletText}>
                                                {bullet.replace('*', '').trim()}
                                            </ThemedText>
                                        </View>
                                    )
                                ))}
                            </View>
                        </View>
                    </View>
                );
            case 'privacy':
                return (
                    <View style={styles.sheetContentContainer}>
                        <View style={[styles.sectionContainer, { backgroundColor: cardColor }]}>
                            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                                {t('onboardingScreen.termsOfService.privacyPolicyTitle')} 🔒
                            </ThemedText>
                            <ThemedText style={styles.sectionText}>
                                {t('onboardingScreen.termsOfService.privacyPolicyContent1')}
                            </ThemedText>
                        </View>
                        <View style={[styles.sectionContainer, { backgroundColor: cardColor }]}>
                            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                                {t('onboardingScreen.termsOfService.privacyPolicyDescription')} 🤝
                            </ThemedText>
                            <View style={styles.bulletContainer}>
                                {t('onboardingScreen.termsOfService.privacyPolicyContent2').split('\n').map((bullet, index) => (
                                    bullet.trim().startsWith('*') && (
                                        <View key={index} style={styles.bulletPoint}>
                                            <ThemedText style={styles.bulletIcon}>•</ThemedText>
                                            <ThemedText style={styles.bulletText}>
                                                {bullet.replace('*', '').trim()}
                                            </ThemedText>
                                        </View>
                                    )
                                ))}
                            </View>
                        </View>
                    </View>
                );
            default:
                return null;
        }
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
                        <TouchableWithoutFeedback
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            onPress={() => onOpenSheet('tos')}
                        >
                            <ThemedText style={[styles.termsText, styles.highlightText]}>
                                {t('onboardingScreen.termsOfService.termsOfServiceLink')}
                            </ThemedText>
                        </TouchableWithoutFeedback>
                    </View>
                    <View style={styles.privacyPolicyTextContainer}>
                        <ThemedText style={styles.termsText}>
                            {t('onboardingScreen.termsOfService.privacyPolicyPrefix')}
                        </ThemedText>
                        <TouchableWithoutFeedback
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            onPress={() => onOpenSheet('privacy')}
                        >
                            <ThemedText style={[styles.termsText, styles.highlightText]}>
                                {t('onboardingScreen.termsOfService.privacyPolicyLink')}
                            </ThemedText>
                        </TouchableWithoutFeedback>
                    </View>
                </View>

                <ThemedButton
                    label={t('onboardingScreen.finishButton')}
                    style={styles.button}
                    onPress={onFinish}
                />
            </View>
            <ThemedReuseableSheet
                ref={bottomSheetRef}
                title={
                    sheetType === 'tos'
                        ? t('onboardingScreen.termsOfService.termsOfServiceSheetTitle')
                        : t('onboardingScreen.termsOfService.privacyPolicySheetTitle')
                }
                // description={
                //     sheetType === 'tos'
                //         ? t('onboardingScreen.termsOfService.termsOfServiceDescription')
                //         : t('onboardingScreen.termsOfService.privacyPolicyDescription')
                // }
                contentType="scroll"
                enableDynamicSizing={true}
                customContent={
                    <View>
                        {renderSheetContent()}
                    </View>
                }
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
        lineHeight: 20
    },
    button: {},
    sheetContentContainer: {
        // paddingHorizontal: 20,
        // paddingBottom: 20,
    },
    sectionContainer: {
        marginBottom: 20,
        borderRadius: 16,
        paddingVertical: 15,
        paddingHorizontal: 20,
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 2 },
        // shadowOpacity: 0.1,
        // shadowRadius: 4,
        // elevation: 3,
    },
    sectionTitle: {
        fontSize: 16,
        marginBottom: 10,
        // color: '#FF6B00', // Orange accent color
    },
    sectionText: {
        fontSize: 14,
        lineHeight: 22,
        // color: '#333',
    },
    bulletContainer: {
        marginTop: 10,
    },
    bulletPoint: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    bulletIcon: {
        fontSize: 20,
        // color: '#FF6B00',
        marginRight: 10,
    },
    bulletText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 22,
        // color: '#333',
    },
});

export default OnBoardScreen;