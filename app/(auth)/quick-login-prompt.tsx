import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  Suspense,
} from 'react';
import {
  StyleSheet,
  View,
  Platform,
  ActivityIndicator,
} from 'react-native';
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

import Avatar, { AvatarFullConfig } from '@zamplyy/react-native-nice-avatar';
import { useIsFocused } from '@react-navigation/native';
import { ThemedTextButton } from '@/components/buttons';

interface QuickLoginPreferences {
  [userId: string]: boolean;
}

export default function QuickLoginPromptScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  // Add navigation state
  const [isNavigating, setIsNavigating] = useState(false);

  // Pre-fetched password for quick login
  const [prefetchedPassword, setPrefetchedPassword] = useState<string | null>(
    null
  );

  const userData = useSelector((s: RootState) => s.auth.user);
  const avatarConfig = useSelector(
    (s: RootState) => s.auth.user?.avatar
  ) as AvatarFullConfig;

  // Memoize avatar config to avoid unnecessary re-renders
  const memoizedAvatarConfig = useMemo(
    () => avatarConfig,
    [avatarConfig?.hairColor, avatarConfig?.hatColor, avatarConfig?.faceColor]
  );

  // Track if component is mounted to avoid state updates after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Pre-fetch the temp password so we don't block on tap
  useEffect(() => {
    getTemporaryPassword().then(pw => {
      if (mountedRef.current) {
        setPrefetchedPassword(pw);
      }
    });
  }, []);

  // If they've already chosen, skip this screen
  useEffect(() => {
    async function checkPref() {
      if (!userData?.id) return;
      const hasPref = await hasQuickLoginPreference(userData.id);
      if (hasPref) {
        if (mountedRef.current) {
          setIsNavigating(true);
        }
        await cleanupTemporaryPassword().catch(() => {});
        router.replace('/(auth)/home');
      }
    }
    checkPref();
  }, [userData?.id]);

  // Handle enabling quick login
  const handleEnableQuickLogin = async () => {
    if (!userData?.id) {
      console.warn('No user ID');
      return;
    }
    setIsLoading(true);

    try {
      // Get password, either prefetched or fetch now
      const pw = prefetchedPassword ?? (await getTemporaryPassword());
      if (!pw) throw new Error('Password not available');

      const pwKey = getPasswordKeyForUserID(userData.id);

      // Save user ID and password in secure storage
      await Promise.all([
        SecureStore.setItemAsync(SECURE_KEYS.SAVED_USER_ID, userData.id),
        SecureStore.setItemAsync(pwKey, pw),
      ]);

      // Update quick login preferences in MMKV
      storage.set(MMKV_KEYS.QUICK_LOGIN_ENABLED, 'true');
      const raw =
        storage.getString(MMKV_KEYS.QUICK_LOGIN_PREFERENCES) ?? '{}';
      const prefs: QuickLoginPreferences = JSON.parse(raw);
      prefs[userData.id] = true;
      storage.set(
        MMKV_KEYS.QUICK_LOGIN_PREFERENCES,
        JSON.stringify(prefs)
      );

      // Clean up temp password
      await cleanupTemporaryPassword();

      // Set navigating state before navigation
      if (mountedRef.current) {
        setIsNavigating(true);
      }

      // Navigate to home screen after all logic is done
      router.replace('/(auth)/home');
    } catch (err) {
      console.warn('QuickLogin setup error', err);
      if (mountedRef.current) {
        setIsLoading(false);
        setIsNavigating(false); // Reset navigation state on error
      }
    }
  };

  // Handle declining quick login
  const handleDeclineQuickLogin = async () => {
    if (!userData?.id) {
      console.warn('No user ID');
      return;
    }
    setIsDeclining(true);

    try {
      // Update quick login preferences in MMKV
      const raw =
        storage.getString(MMKV_KEYS.QUICK_LOGIN_PREFERENCES) ?? '{}';
      const prefs: QuickLoginPreferences = JSON.parse(raw);
      prefs[userData.id] = false;
      storage.set(
        MMKV_KEYS.QUICK_LOGIN_PREFERENCES,
        JSON.stringify(prefs)
      );

      // Clean up temp password
      await cleanupTemporaryPassword();

      // Set navigating state before navigation
      if (mountedRef.current) {
        setIsNavigating(true);
      }

      // Navigate to home screen after all logic is done
      router.replace('/(auth)/home');
    } catch (err) {
      console.warn('DeclineQuickLogin error', err);
      if (mountedRef.current) {
        setIsDeclining(false);
        setIsNavigating(false); // Reset navigation state on error
      }
    }
  };

  const AvatarPlaceholder = () => (
    <View
      style={[
        styles.avatar,
        {
          backgroundColor: '#f0f0f0',
          justifyContent: 'center',
          alignItems: 'center',
        },
      ]}
    >
      <ActivityIndicator color="#a18cd1" />
    </View>
  );

  // // Show navigation loading state
  // if (isNavigating) {
  //   return (
  //     <ThemedView style={styles.container}>
  //       <View style={[styles.contentContainer, { justifyContent: 'center' }]}>
  //         <ActivityIndicator size="large" color="#a18cd1" />
  //         <ThemedText style={styles.navigationText}>
  //           {t('quickLoginPrompt.redirecting')}
  //         </ThemedText>
  //       </View>
  //     </ThemedView>
  //   );
  // }

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
            {memoizedAvatarConfig ? (
              <Suspense fallback={<AvatarPlaceholder />}>
                <Avatar
                  style={styles.avatar}
                  size={getResponsiveWidth(40)}
                  {...memoizedAvatarConfig}
                />
              </Suspense>
            ) : (
              <AvatarPlaceholder />
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
          disabled={isNavigating} // Disable during navigation
        />
        <ThemedButton
          label={t('quickLoginPrompt.notNow')}
          style={styles.notNowButton}
          onPress={handleDeclineQuickLogin}
          loading={isDeclining}
          loadingLabel={t('quickLoginPrompt.saving')}
          textStyle={styles.notNowButtonText}
          variant='text'
          
          disabled={isNavigating} // Disable during navigation
        />
      </View>
    </ThemedView>
  );
}

// Styles for the quick login prompt screen
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
    width: getResponsiveWidth(40),
    height: getResponsiveWidth(40),
  },
  buttonContainer: {
    width: '100%',
    marginBottom:
      Platform.OS === 'ios'
        ? getResponsiveHeight(4)
        : getResponsiveHeight(3),
    paddingBottom:
      Platform.OS === 'android' ? getResponsiveHeight(1) : 0,
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
  navigationText: {
    marginTop: getResponsiveHeight(2),
    textAlign: 'center',
    fontSize: getResponsiveFontSize(16),
    opacity: 0.8,
  },
});