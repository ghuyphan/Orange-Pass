import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { StyleSheet, View, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/ThemedText';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { ThemedView } from '@/components/ThemedView';
import { t } from '@/i18n';
import {
  getResponsiveFontSize,
  getResponsiveWidth,
  getResponsiveHeight,
} from '@/utils/responsive';
import { RootState } from '@/store/rootReducer';
import {
  SECURE_KEYS,
  MMKV_KEYS,
  getTemporaryPassword,
  hasQuickLoginPreference,
  cleanupTemporaryPassword,
  getPasswordKeyForUserID,
} from '@/services/auth/login';
import * as SecureStore from 'expo-secure-store';
import { storage } from '@/utils/storage';
// import Avatar
import Avatar, { AvatarFullConfig } from '@zamplyy/react-native-nice-avatar';
// Lazy load the avatar component
// const Avatar = lazy(() => import('@zamplyy/react-native-nice-avatar'));

// Interface for quick login preferences
interface QuickLoginPreferences {
  [email: string]: boolean;
}

export default function QuickLoginPromptScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [shouldShowPrompt, setShouldShowPrompt] = useState(true);

  const userData = useSelector((state: RootState) => state.auth.user);
  const avatarConfig = useSelector((state: RootState) => state.auth.user?.avatar) as AvatarFullConfig;

  // Memoize the avatar configuration to prevent re-renders when other parts of state change
  const memoizedAvatarConfig = useMemo(() => avatarConfig, [
    // Only include properties that would affect the visual appearance
    avatarConfig?.hairColor,
    avatarConfig?.hatColor,
    avatarConfig?.faceColor,
    // Add other critical avatar properties here
  ]);

  useEffect(() => {
    // Check if user has already made a decision about quick login
    const checkQuickLoginPreference = async () => {
      if (userData?.id) {
        const hasPreference = await hasQuickLoginPreference(userData.id);
        if (hasPreference) {
          // User already made a decision, skip prompt and go to home
          cleanupTemporaryPassword();
          router.replace('/(auth)/home');
        }
      }
    };

    checkQuickLoginPreference();
  }, [userData?.id]);

  const handleEnableQuickLogin = async () => {
    setIsLoading(true);
    try {
      if (!userData?.id) {
        throw new Error('User ID not available');
      }

      // Get temporary password stored during login
      const password = await getTemporaryPassword();
      if (!password) {
        throw new Error('Password not available for quick login setup');
      }

      // Store userID securely
      await SecureStore.setItemAsync(SECURE_KEYS.SAVED_USER_ID, userData.id);

      // Store password using the safe key format
      const passwordKey = getPasswordKeyForUserID(userData.id);
      await SecureStore.setItemAsync(passwordKey, password);

      // Enable quick login in MMKV
      storage.set(MMKV_KEYS.QUICK_LOGIN_ENABLED, 'true');

      // Update quick login preferences for this userID
      const prefsString = storage.getString(MMKV_KEYS.QUICK_LOGIN_PREFERENCES) || '{}';
      try {
        const currentPrefs: QuickLoginPreferences = JSON.parse(prefsString);
        const updatedPrefs = {
          ...currentPrefs,
          [userData.id]: true,
        };

        storage.set(
          MMKV_KEYS.QUICK_LOGIN_PREFERENCES,
          JSON.stringify(updatedPrefs)
        );
      } catch (e) {
        // If parsing fails, create a new preferences object
        const newPrefs = { [userData.id]: true };
        storage.set(
          MMKV_KEYS.QUICK_LOGIN_PREFERENCES,
          JSON.stringify(newPrefs)
        );
      }

      // Clean up temporary password
      await cleanupTemporaryPassword();

      // Navigate to home screen
      router.replace('/(auth)/home');
    } catch (error) {
      console.error('Error setting up quick login:', error);
      // Navigate to home anyway if there's an error
      router.replace('/(auth)/home');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeclineQuickLogin = async () => {
    setIsDeclining(true); // Set loading state
    try {
      if (!userData?.id) {
        throw new Error('User ID not available');
      }

      // Update quick login preferences for this userID
      const prefsString = storage.getString(MMKV_KEYS.QUICK_LOGIN_PREFERENCES) || '{}';
      try {
        const currentPrefs: QuickLoginPreferences = JSON.parse(prefsString);
        const updatedPrefs = {
          ...currentPrefs,
          [userData.id]: false,
        };

        storage.set(
          MMKV_KEYS.QUICK_LOGIN_PREFERENCES,
          JSON.stringify(updatedPrefs)
        );
      } catch (e) {
        // If parsing fails, create a new preferences object
        const newPrefs = { [userData.id]: false };
        storage.set(
          MMKV_KEYS.QUICK_LOGIN_PREFERENCES,
          JSON.stringify(newPrefs)
        );
      }

      // Clean up temporary password
      await cleanupTemporaryPassword();

      // Navigate to home screen
      router.replace('/(auth)/home');
    } catch (error) {
      console.error('Error saving quick login preference:', error);
      router.replace('/(auth)/home');
    } finally {
      setIsLoading(false); // Reset loading state
    }
  };

  // Simple placeholder component to show while avatar is loading
  const AvatarPlaceholder = () => (
    <View style={[styles.avatar, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator color="#a18cd1" />
    </View>
  );

  if (!shouldShowPrompt) {
    return null;
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.contentContainer}>
        <View style={styles.headerContainer}>
          <ThemedText type="defaultSemiBold" style={styles.title}>
            {t('quickLoginPrompt.saveLoginInfo')}
          </ThemedText>

          <ThemedText style={styles.description}>
            {t('quickLoginPrompt.saveDescription')}
          </ThemedText>
        </View>

        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={['#ff9a9e', '#fad0c4', '#fad0c4', '#fbc2eb', '#a18cd1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            {memoizedAvatarConfig && (
              <Suspense fallback={<AvatarPlaceholder />}>
                <Avatar
                  style={styles.avatar}
                  size={getResponsiveWidth(40)}
                  {...memoizedAvatarConfig}
                />
              </Suspense>
            )}
          </LinearGradient>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <ThemedButton
          label={t('quickLoginPrompt.save')}
          style={styles.saveButton}
          onPress={handleEnableQuickLogin}
          loading={isLoading}
          loadingLabel={t('quickLoginPrompt.saving')}
          textStyle={styles.saveButtonText}
        />

        <ThemedButton
          label={t('quickLoginPrompt.notNow')}
          style={styles.notNowButton}
          onPress={handleDeclineQuickLogin}
          textStyle={styles.notNowButtonText}
          loading={isDeclining} // Add loading prop
          loadingLabel={t('quickLoginPrompt.saving')} // Optional: Add loading label
          outline
        />

      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: getResponsiveWidth(3.6),
    justifyContent: 'space-between',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: getResponsiveHeight(6),
    paddingHorizontal: getResponsiveWidth(2),
  },
  title: {
    fontSize: getResponsiveFontSize(24),
    lineHeight: getResponsiveFontSize(32),
    marginBottom: getResponsiveHeight(2),
    textAlign: 'center',
  },
  description: {
    fontSize: getResponsiveFontSize(16),
    textAlign: 'center',
    lineHeight: getResponsiveFontSize(24),
    opacity: 0.8,
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    borderRadius: getResponsiveWidth(40),
    justifyContent: 'center',
    alignItems: 'center',
    padding: getResponsiveWidth(1.2),
  },
  avatar: {
    borderRadius: getResponsiveWidth(40),
    overflow: 'hidden',
    width: getResponsiveWidth(40),
    height: getResponsiveWidth(40),
  },
  buttonContainer: {
    width: '100%',
    marginBottom: Platform.OS === 'ios' ? getResponsiveHeight(4) : getResponsiveHeight(3),
    paddingBottom: Platform.OS === 'android' ? getResponsiveHeight(1) : 0,
    gap: getResponsiveHeight(1.5),
  },
  saveButton: {

    borderRadius: getResponsiveWidth(8),
  },
  saveButtonText: {
    fontWeight: 'bold',
    fontSize: getResponsiveFontSize(16),
  },
  notNowButton: {

    borderRadius: getResponsiveWidth(8),
  },
  notNowButtonText: {
    fontSize: getResponsiveFontSize(16),
  },
});