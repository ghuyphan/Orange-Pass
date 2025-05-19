import React, { useRef, useState, useCallback, useMemo } from 'react';
import { StyleSheet, View, TouchableWithoutFeedback, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { ThemedButton } from '@/components/buttons/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { t } from '@/i18n';
import { useThemeColor } from '@/hooks/useThemeColor';
import { storage } from '@/utils/storage';
import { triggerSuccessHapticFeedback } from '@/utils/haptic';
import { Colors } from '@/constants/Colors';
import LOGO from '@/assets/svgs/orange-logo.svg';
import ThemedReuseableSheet from '@/components/bottomsheet/ThemedReusableSheet';
import BottomSheet from '@gorhom/bottom-sheet';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';
import { useTheme } from '@/context/ThemeContext';
import { initializeGuestMode } from '@/services/auth';

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
  const { currentTheme } = useTheme();
  const iconColor = useThemeColor({ light: Colors.light.icon, dark: Colors.dark.icon }, 'buttonBackground');
  const cardColor = useThemeColor({ light: Colors.light.cardBackground, dark: Colors.dark.cardBackground }, 'buttonBackground');
  const accentColor = useThemeColor({ light: '#FFC107', dark: '#FFC107' }, 'text');
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
  }, [router]);

  const onContinueAsGuest = useCallback(async () => {
    storage.set('hasSeenOnboarding', true);
    triggerSuccessHapticFeedback();
    
    // Initialize guest mode
    await initializeGuestMode();
    
    // Navigate to guest home
    router.replace('/guest-home');
  }, [router]);

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
    return () => {
      if (sheetType === 'tos') {
        return <TermsOfServiceContent cardColor={cardColor} />;
      } else if (sheetType === 'privacy') {
        return <PrivacyPolicyContent cardColor={cardColor} />;
      }
      return null;
    };
  }, [sheetType, cardColor]);

  return (
    <KeyboardAwareScrollView
      keyboardShouldPersistTaps="handled"
      style={{
        backgroundColor:
          currentTheme === "light"
            ? Colors.light.background
            : Colors.dark.background,
      }}
      contentContainerStyle={styles.container}
      extraScrollHeight={Platform.OS === "ios" ? getResponsiveHeight(4) : 0}
      enableOnAndroid={true}
      enableResetScrollToCoords={false}
      showsVerticalScrollIndicator={false}
      scrollEnabled={true}
      keyboardOpeningTime={0}
    >
      <View style={styles.contentContainer}>
        <View style={styles.logoContainer}>
          <LOGO width={getResponsiveWidth(14)} height={getResponsiveWidth(14)} />
        </View>

        <View style={styles.featuresContainer}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureContainer}>
              <View style={[styles.iconContainer, { backgroundColor: cardColor }]}>
                <MaterialCommunityIcons 
                  name={feature.icon as any} 
                  size={getResponsiveWidth(7)} 
                  color={iconColor} 
                />
              </View>
              <View style={styles.featureTextContainer}>
                <ThemedText type="defaultSemiBold" style={styles.title}>
                  {feature.title}
                </ThemedText>
                <ThemedText style={styles.subtitle}>{feature.subtitle}</ThemedText>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.bottomContainer}>
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
          textStyle={styles.buttonText}
          onPress={onContinueAsGuest}
        />
        
        {/* <ThemedButton
          label={t('onboardingScreen.continueAsGuest')} // Add this to your translation
          style={styles.guestButton}
          textStyle={styles.guestButtonText}
          onPress={onContinueAsGuest}
          mode="text" // Using text mode for less emphasis
        /> */}
        
        <ThemedText type="defaultSemiBold" style={styles.metaText}>
          {t("common.appName")}
        </ThemedText>
      </View>
      
      <ThemedReuseableSheet
        ref={bottomSheetRef}
        title={
          sheetType === 'tos'
            ? t('onboardingScreen.termsOfService.termsOfServiceSheetTitle')
            : t('onboardingScreen.termsOfService.privacyPolicySheetTitle')
        }
        contentType="scroll"
        styles={{
          scrollViewContent: {
            borderRadius: getResponsiveWidth(4),
            marginHorizontal: getResponsiveWidth(3.6),
          }
        }}
        snapPoints={['65%']}
        customContent={renderSheetContent()}
        showCloseButton={true}
      />
    </KeyboardAwareScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: getResponsiveWidth(3.6),
    justifyContent: "space-between",
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
  },
  logoContainer: {
    backgroundColor: '#FFF5E1',
    padding: getResponsiveWidth(3.5),
    borderRadius: getResponsiveWidth(5),
    marginTop: getResponsiveHeight(10),
    marginBottom: getResponsiveHeight(9),
  },
  screenTitle: {
    fontSize: getResponsiveFontSize(24),
    textAlign: 'center',
    marginBottom: getResponsiveHeight(6),
  },
  featuresContainer: {
    width: '100%',
    gap: getResponsiveHeight(4),
    paddingHorizontal: getResponsiveWidth(2),
  },
  featureContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveWidth(4),
  },
  iconContainer: {
    width: getResponsiveWidth(12),
    height: getResponsiveWidth(12),
    borderRadius: getResponsiveWidth(6),
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: getResponsiveFontSize(16),
    marginBottom: getResponsiveHeight(0.8),
  },
  subtitle: {
    fontSize: getResponsiveFontSize(14),
    opacity: 0.7,
    lineHeight: getResponsiveFontSize(20),
  },
  bottomContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? getResponsiveHeight(4) : getResponsiveHeight(3),
  },
  termsContainer: {
    alignItems: 'center',
    marginBottom: getResponsiveHeight(2.5),
  },
  termsText: {
    fontSize: getResponsiveFontSize(12),
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  termsTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: getResponsiveWidth(1),
    marginBottom: getResponsiveHeight(0.5),
  },
  privacyPolicyTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: getResponsiveWidth(1),
  },
  highlightText: {
    color: '#FFC107',
    fontSize: getResponsiveFontSize(12),
    letterSpacing: 0.5,
  },
  button: {
    width: '100%',
    marginBottom: getResponsiveHeight(1.5), // Reduced to make room for the guest button
  },
  buttonText: {
    fontWeight: 'bold',
    fontSize: getResponsiveFontSize(16),
  },
  // New guest button styles
  guestButton: {
    width: '100%',
    marginBottom: getResponsiveHeight(2),
  },
  guestButtonText: {
    fontSize: getResponsiveFontSize(14),
    opacity: 0.8,
  },
  metaText: {
    fontSize: getResponsiveFontSize(16),
    opacity: 0.7,
  },
  sectionContainer: {
    borderRadius: getResponsiveWidth(4),
    paddingVertical: getResponsiveHeight(1.8),
    paddingHorizontal: getResponsiveWidth(4.8),
  },
  sectionTitle: {
    fontSize: getResponsiveFontSize(16),
    marginBottom: getResponsiveHeight(1.2),
  },
  sectionText: {
    fontSize: getResponsiveFontSize(14),
    lineHeight: getResponsiveFontSize(22),
  },
  bulletContainer: {
    gap: getResponsiveHeight(1.2),
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
