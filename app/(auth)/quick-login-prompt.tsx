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
  InteractionManager,
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

interface QuickLoginPreferences {
  [userId: string]: boolean;
}

export default function QuickLoginPromptScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [shouldShowPrompt, setShouldShowPrompt] = useState(true);

  // 1) Allow null, since getTemporaryPassword() may return null
  const [prefetchedPassword, setPrefetchedPassword] = useState<string | null>(
    null
  );

  const userData = useSelector((s: RootState) => s.auth.user);
  const avatarConfig = useSelector(
    (s: RootState) => s.auth.user?.avatar
  ) as AvatarFullConfig;

  const memoizedAvatarConfig = useMemo(
    () => avatarConfig,
    [avatarConfig?.hairColor, avatarConfig?.hatColor, avatarConfig?.faceColor]
  );

  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Pre-fetch the temp password so we don't block on tap
  useEffect(() => {
    getTemporaryPassword().then(pw => {
      setPrefetchedPassword(pw);
    });
  }, []);

  // If they've already chosen, skip this screen
  useEffect(() => {
    async function checkPref() {
      if (!userData?.id) return;
      const hasPref = await hasQuickLoginPreference(userData.id);
      if (hasPref) {
        await cleanupTemporaryPassword().catch(() => {});
        router.replace('/(auth)/home');
      }
    }
    checkPref();
  }, [userData?.id]);

  const handleEnableQuickLogin = () => {
    if (!userData?.id) {
      console.warn('No user ID');
      return;
    }
    setIsLoading(true);

    // Let RN render the spinner first
    requestAnimationFrame(() => {
      router.replace('/(auth)/home');

      InteractionManager.runAfterInteractions(async () => {
        try {
          // 2) Guard that pw is a non-null string
          const pw =
            prefetchedPassword ?? (await getTemporaryPassword());
          if (!pw) throw new Error('Password not available');

          const pwKey = getPasswordKeyForUserID(userData.id);

          // Parallel writes
          await Promise.all([
            SecureStore.setItemAsync(
              SECURE_KEYS.SAVED_USER_ID,
              userData.id
            ),
            SecureStore.setItemAsync(pwKey, pw),
          ]);

          storage.set(MMKV_KEYS.QUICK_LOGIN_ENABLED, 'true');
          const raw =
            storage.getString(MMKV_KEYS.QUICK_LOGIN_PREFERENCES) ?? '{}';
          const prefs: QuickLoginPreferences = JSON.parse(raw);
          prefs[userData.id] = true;
          storage.set(
            MMKV_KEYS.QUICK_LOGIN_PREFERENCES,
            JSON.stringify(prefs)
          );

          await cleanupTemporaryPassword();
        } catch (err) {
          console.warn('QuickLogin setup error', err);
        } finally {
          if (mountedRef.current) {
            setIsLoading(false);
          }
        }
      });
    });
  };

  const handleDeclineQuickLogin = () => {
    if (!userData?.id) {
      console.warn('No user ID');
      return;
    }
    setIsDeclining(true);

    requestAnimationFrame(() => {
      router.replace('/(auth)/home');

      InteractionManager.runAfterInteractions(async () => {
        try {
          const raw =
            storage.getString(MMKV_KEYS.QUICK_LOGIN_PREFERENCES) ?? '{}';
          const prefs: QuickLoginPreferences = JSON.parse(raw);
          prefs[userData.id] = false;
          storage.set(
            MMKV_KEYS.QUICK_LOGIN_PREFERENCES,
            JSON.stringify(prefs)
          );

          await cleanupTemporaryPassword();
        } catch (err) {
          console.warn('DeclineQuickLogin error', err);
        } finally {
          if (mountedRef.current) {
            setIsDeclining(false);
          }
        }
      });
    });
  };

  if (!shouldShowPrompt) return null;

  const AvatarPlaceholder = () => (
    <View
      style={[
        styles.avatar,
        { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
      ]}
    >
      <ActivityIndicator color="#a18cd1" />
    </View>
  );

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
        />

        <ThemedButton
          label={t('quickLoginPrompt.notNow')}
          style={styles.notNowButton}
          onPress={handleDeclineQuickLogin}
          loading={isDeclining}
          loadingLabel={t('quickLoginPrompt.saving')}
          textStyle={styles.notNowButtonText}
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
});
