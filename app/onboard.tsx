import React, { useRef, useState, useCallback, useMemo } from 'react';
import { StyleSheet, View, TouchableWithoutFeedback, ScrollView } from 'react-native';
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
import ThemedReuseableSheet from '@/components/bottomsheet/ThemedReusableSheet';
import BottomSheet from '@gorhom/bottom-sheet';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';

// Define a type for features
type Feature = {
  icon: string;
  title: string;
  subtitle: string;
};

// Type for bottom sheet types
type SheetType = 'tos' | 'privacy' | null;

// Terms of Service Content
const TermsOfServiceContent = ({ cardColor }: { cardColor: string }) => (
  <>
    <View style={[styles.sectionContainer, { backgroundColor: cardColor, marginBottom: getResponsiveHeight(2.4) }]}>
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
        {t('onboardingScreen.termsOfService.termsOfServiceContent2')
          .split('\n')
          .map((bullet, index) =>
            bullet.trim().startsWith('*') ? (
              <View key={index} style={styles.bulletPoint}>
                <ThemedText style={styles.bulletIcon}>•</ThemedText>
                <ThemedText style={styles.bulletText}>{bullet.replace('*', '').trim()}</ThemedText>
              </View>
            ) : null
          )}
      </View>
    </View>
  </>
);

// Privacy Policy Content
const PrivacyPolicyContent = ({ cardColor }: { cardColor: string }) => (
  <>
    <View style={[styles.sectionContainer, { backgroundColor: cardColor, marginBottom: getResponsiveHeight(2.4) }]}>
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
        {t('onboardingScreen.termsOfService.privacyPolicyContent2')
          .split('\n')
          .map((bullet, index) =>
            bullet.trim().startsWith('*') ? (
              <View key={index} style={styles.bulletPoint}>
                <ThemedText style={styles.bulletIcon}>•</ThemedText>
                <ThemedText style={styles.bulletText}>{bullet.replace('*', '').trim()}</ThemedText>
              </View>
            ) : null
          )}
      </View>
    </View>
  </>
);

const OnBoardScreen = () => {
  const router = useRouter();
  const iconColor = useThemeColor({ light: Colors.light.icon, dark: Colors.dark.icon }, 'buttonBackground');
  const cardColor = useThemeColor({ light: Colors.light.cardBackground, dark: Colors.dark.cardBackground }, 'buttonBackground');
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [sheetType, setSheetType] = useState<SheetType>(null);

  // Array of features to display
  const features: Feature[] = [
    {
      icon: 'qrcode-scan',
      title: t('onboardingScreen.title1'),
      subtitle: t('onboardingScreen.subtitle1'),
    },
    {
      icon: 'cloud-sync-outline',
      title: t('onboardingScreen.title2'),
      subtitle: t('onboardingScreen.subtitle2'),
    },
    {
      icon: 'earth',
      title: t('onboardingScreen.title3'),
      subtitle: t('onboardingScreen.subtitle3'),
    },
  ];

  const onFinish = useCallback(() => {
    storage.set('hasSeenOnboarding', true);
    triggerSuccessHapticFeedback();
    router.replace('/login');
  }, []);

  const onOpenSheet = useCallback((type: SheetType) => {
    setSheetType(type);
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  const onCloseSheet = useCallback(() => {
    bottomSheetRef.current?.close();
    setSheetType(null);
  }, []);

  // Memoize the sheet content based on sheetType and cardColor
  const renderSheetContent = useMemo(() => {
    return () => (
      <ScrollView style={styles.sheetContentContainer}>
        {sheetType === 'tos' && <TermsOfServiceContent cardColor={cardColor} />}
        {sheetType === 'privacy' && <PrivacyPolicyContent cardColor={cardColor} />}
      </ScrollView>
    )
  }, [sheetType, cardColor]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.topContainer}>
        <View style={styles.logoContainer}>
          <LOGO width={getResponsiveWidth(14)} height={getResponsiveWidth(14)} />
        </View>
        <ThemedText  style={styles.screenTitle} type="title">{t('onboardingScreen.title')}</ThemedText>
      </View>

      <View style={styles.contentContainer}>
        {features.map((feature, index) => (
          <View key={index} style={styles.featureContainer}>
            <MaterialCommunityIcons name={feature.icon as any} size={getResponsiveWidth(9)} color={iconColor} />
            <View style={styles.featureTextContainer}>
              <ThemedText type="defaultSemiBold" style={styles.title}>
                {feature.title}
              </ThemedText>
              <ThemedText style={styles.subtitle}>{feature.subtitle}</ThemedText>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.bottomContainer}>
        <MaterialCommunityIcons
          name="account-multiple"
          size={getResponsiveWidth(6)}
          color={iconColor}
          style={styles.bottomIcon}
        />
        <View style={styles.termsContainer}>
          <View style={styles.termsTextContainer}>
            <ThemedText style={styles.termsText}>
              {t('onboardingScreen.termsOfService.agreementPrefix')}
            </ThemedText>
            <TouchableWithoutFeedback
              hitSlop={{ top: getResponsiveHeight(1.2), bottom: getResponsiveHeight(1.2), left: getResponsiveWidth(2.4), right: getResponsiveWidth(2.4) }}
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
              hitSlop={{ top: getResponsiveHeight(1.2), bottom: getResponsiveHeight(1.2), left: getResponsiveWidth(2.4), right: getResponsiveWidth(2.4) }}
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
        contentType="scroll"
        enableDynamicSizing={true}
        customContent={<>{renderSheetContent()}</>}
      />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topContainer: {
    marginTop: getResponsiveHeight(10),
    gap: getResponsiveHeight(2.4),
    alignItems: 'center',
  },
  logoContainer: {
    backgroundColor: '#FFF5E1',
    padding: getResponsiveWidth(3.5),
    borderRadius: getResponsiveWidth(5),
  },
  screenTitle:{
    fontSize: getResponsiveFontSize(25),
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: getResponsiveHeight(5),
  },
  featureContainer: {
    flexDirection: 'row',
    gap: getResponsiveWidth(5),
    marginHorizontal: getResponsiveWidth(7.5),
    alignItems: 'center',
  },
  featureTextContainer: {
    flexDirection: 'column',
    flex: 1,
    width: '100%',
  },
  title: {
    fontSize: getResponsiveFontSize(16),
  },
  subtitle: {
    fontSize: getResponsiveFontSize(14),
    opacity: 0.7,
    lineHeight: getResponsiveFontSize(20),
  },
  bottomContainer: {
    paddingTop: getResponsiveHeight(1.8),
    paddingBottom: getResponsiveHeight(3.6),
    // paddingHorizontal: getResponsiveWidth(3.6),
    gap: getResponsiveHeight(1.8),
    justifyContent: 'center',
  },
  bottomIcon: {
    alignSelf: 'center',
    marginBottom: -getResponsiveWidth(2.4),
  },
  termsContainer: {
    alignItems: 'center',
    paddingHorizontal: getResponsiveWidth(5),
  },
  termsText: {
    fontSize: getResponsiveFontSize(12),
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  termsTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveWidth(1.2),
  },
  privacyPolicyTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveWidth(1.2),
  },
  highlightText: {
    color: '#FFC107',
    fontSize: getResponsiveFontSize(12),
    letterSpacing: 0.5,
    lineHeight: getResponsiveFontSize(20),
  },
  button: {
    marginHorizontal: getResponsiveWidth(3.6),
  },
  sheetContentContainer: {
    // paddingHorizontal: getResponsiveWidth(3.6),
  },
  sectionContainer: {
    borderRadius: getResponsiveWidth(4),
    paddingVertical: getResponsiveHeight(1.8),
    paddingHorizontal: getResponsiveWidth(4.8),
  },
  sectionTitle: {
    fontSize: getResponsiveFontSize(16),
    marginBottom: getResponsiveHeight(0.5),
  },
  sectionText: {
    fontSize: getResponsiveFontSize(14),
    lineHeight: getResponsiveFontSize(22),
  },
  bulletContainer: {
    marginTop: getResponsiveHeight(1.2),
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: getResponsiveHeight(1.2),
  },
  bulletIcon: {
    fontSize: getResponsiveFontSize(20),
    marginRight: getResponsiveWidth(2.4),
  },
  bulletText: {
    flex: 1,
    fontSize: getResponsiveFontSize(14),
    lineHeight: getResponsiveFontSize(22),
  },
});

export default OnBoardScreen;