import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
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

// Define a type for features
type Feature = {
    icon: string;
    title: string;
    subtitle: string;
};

const OnBoardScreen = () => {
    const router = useRouter();
    const iconColor = useThemeColor({ light: Colors.dark.cardFooter, dark: Colors.light.cardFooter }, 'buttonBackground');

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

    return (
        <ThemedView style={styles.container}>
            <View style={styles.topContainer}>
                <View style={styles.logoContainer}>
                    <LOGO width={width * 0.14} height={width * 0.14} />
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
                    <ThemedText style={styles.termsText}>
                        By pressing continue, you agree to our{' '}
                        <ThemedText style={styles.highlightText}>Terms of Service</ThemedText>{' '}
                        and that you have read our{' '}
                        <ThemedText style={styles.highlightText}>Privacy Policy</ThemedText>
                    </ThemedText>
                </View>

                <ThemedButton 
                    label={t('onboardingScreen.finishButton')} 
                    style={styles.button} 
                    onPress={onFinish} 
                />
            </View>
        </ThemedView>
    );
};

const { width } = Dimensions.get('window');

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
        gap: 15,
        marginHorizontal: 30,
        alignItems: 'center',
        // marginBottom: 10
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
        fontSize: 16,
        opacity: 0.7,
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
        textAlign: 'center'
    },
    highlightText: {
        color: '#FFC107', 
        fontSize: 12, 
        letterSpacing: 0.5,
        // fontWeight: 'bold'
    },
    button: {},
});

export default OnBoardScreen;