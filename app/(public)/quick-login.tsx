import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Keyboard,
  Platform,
  TextInput,
  FlatList,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from '@zamplyy/react-native-nice-avatar';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useMMKVString } from 'react-native-mmkv';

import { ThemedText } from '@/components/ThemedText';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { ThemedToast } from '@/components/toast/ThemedToast';
import { ThemedTextButton } from '@/components/buttons';
import { Logo } from '@/components/AppLogo';
import { Colors } from '@/constants/Colors';
import { t } from '@/i18n';
import { useTheme } from '@/context/ThemeContext';
import { useLocale } from '@/context/LocaleContext';
import {
  getResponsiveFontSize,
  getResponsiveWidth,
  getResponsiveHeight,
} from '@/utils/responsive';
import {
  getSavedUserID,
  getQuickLoginAccounts,
  quickLogin,
  login,
} from '@/services/auth/login';
import { getUserById } from '@/services/localDB/userDB';
import { storage } from '@/utils/storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Define interface for saved accounts
interface SavedAccount {
  userID: string;
  displayName?: string;
  avatarConfig?: any;
}

export default function QuickLoginScreen() {
  const { updateLocale } = useLocale();
  const [locale, setLocale] = useMMKVString('locale' );
  const { currentTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const passwordInputRef = useRef<TextInput>(null);
  const loginCanceledRef = useRef(false);


  // State management
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [savedUserID, setSavedUserID] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<SavedAccount | null>(null);
  const [showMultipleAccounts, setShowMultipleAccounts] = useState(false);

  // Animation values
  const passwordFieldOpacity = useSharedValue(0);
  const passwordFieldHeight = useSharedValue(0);
  const accountsViewOpacity = useSharedValue(1);

  // Memoized values
  const sectionColor = useMemo(
    () => (currentTheme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground),
    [currentTheme]
  );

  const primaryColor = useMemo(
    () => (currentTheme === 'light' ? Colors.light.text : Colors.dark.text),
    [currentTheme]
  );

  const textColor = useMemo(
    () => (currentTheme === 'light' ? Colors.light.text : Colors.dark.text),
    [currentTheme]
  );

  const inputBackgroundColor = useMemo(
    () => (currentTheme === 'light' ? Colors.light.inputBackground : Colors.dark.inputBackground),
    [currentTheme]
  );

  // Load saved accounts on component mount
  useEffect(() => {
    let isMounted = true;

    const loadSavedAccounts = async () => {
      try {
        const userID = await getSavedUserID();
        if (!isMounted) return;
        setSavedUserID(userID);

        const accounts = await getQuickLoginAccounts();
        if (!accounts || accounts.length === 0) {
          router.replace('/login');
          return;
        }

        const accountsWithDetails = await Promise.all(
          accounts.map(async (userID) => {
            try {
              const userData = await getUserById(userID);
              return {
                userID,
                displayName: userData?.name || userData?.username || userID,
                // avatarConfig: userData?.avatar ? JSON.parse(userData.avatar) : null,
              };
            } catch (e) {
              console.error(`Error getting user data for ${userID}:`, e);
              return { userID };
            }
          })
        );

        if (!isMounted) return;
        setSavedAccounts(accountsWithDetails);

        if (accountsWithDetails.length > 1) {
          setShowMultipleAccounts(true);
        } else if (accountsWithDetails.length === 1) {
          setSelectedAccount(accountsWithDetails[0]);
          setSavedUserID(accountsWithDetails[0].userID);
        }
      } catch (error) {
        console.error('Error loading saved accounts:', error);
        showError('Failed to load saved accounts');
        router.replace('/login');
      }
    };

    loadSavedAccounts();

    return () => {
      isMounted = false;
    };
  }, []);

  // Helper for showing errors
  const showError = (message: string) => {
    setErrorMessage(message);
    setIsToastVisible(true);
  };

  const onDismissToast = () => {
    setIsToastVisible(false);
  };

  const onNavigateToRegister = () => {
    Keyboard.dismiss();
    router.push('/register');
  };

  // const handleCancelLogin = () => {
  //   // Set the canceled flag to true
  //   loginCanceledRef.current = true;
    
  //   // Stop showing loading state
  //   setIsLoading(false);
    
  //   // Show cancellation message
  //   setErrorMessage(t('quickLoginScreen.loginCancelled') || 'Login cancelled');
  //   setIsToastVisible(true);
    
  //   // Reset password field if it was shown
  //   if (showPasswordField) {
  //     setPassword('');
  //   }
  // };

  const handleQuickLogin = async () => {
    if (!selectedAccount) {
      showError(t('quickLoginScreen.errors.noAccountSelected'));
      return;
    }
    
    // Reset the canceled flag before starting
    loginCanceledRef.current = false;
    
    setIsLoading(true);
    setErrorMessage('');
  
    try {
      const loginSuccess = await quickLogin(selectedAccount.userID);
  
      // Check if login was canceled while waiting for the response
      if (loginCanceledRef.current) {
        // Do not navigate if canceled
        return;
      }
  
      if (loginSuccess) {
        router.replace('/(auth)/home');
      } else {
        setShowPasswordField(true);
        showError(t('quickLoginScreen.errors.quickLoginFailed'));
        setTimeout(() => passwordInputRef.current?.focus(), 300);
      }
    } catch (error) {
      // Only show error if not canceled
      if (!loginCanceledRef.current) {
        showError((error as Error).message);
        setShowPasswordField(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    Keyboard.dismiss();

    const loginUserID = selectedAccount?.userID || savedUserID;
    if (!loginUserID) {
      showError(t('quickLoginScreen.errors.noUserIDSelected'));
      return;
    }

    if (!password) {
      showError(t('quickLoginScreen.errors.passwordRequired'));
      passwordInputRef.current?.focus();
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      await login(loginUserID, password, true, true);
      router.replace('/(auth)/home');
    } catch (error) {
      showError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountSelect = async (account: SavedAccount) => {
    if (isLoading) return;

    setSelectedAccount(account);
    setSavedUserID(account.userID);
    setIsLoading(true);
    setErrorMessage('');

    try {
      const loginSuccess = await quickLogin(account.userID);

      if (loginSuccess) {
        router.replace('/(auth)/home');
      } else {
        setShowPasswordField(true);
        showError(t('quickLoginScreen.errors.quickLoginFailed'));
        setTimeout(() => passwordInputRef.current?.focus(), 300);
      }
    } catch (error) {
      showError((error as Error).message);
      setShowPasswordField(true);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAccountsView = () => {
    setShowMultipleAccounts(!showMultipleAccounts);
    setShowPasswordField(false);
  };

  // Animated styles
  const passwordFieldStyle = useAnimatedStyle(() => ({
    opacity: passwordFieldOpacity.value,
    height: passwordFieldHeight.value,
  }));

  const accountsViewStyle = useAnimatedStyle(() => ({
    opacity: accountsViewOpacity.value,
  }));

  // Render a single account item
  const renderAccountItem = ({ item }: { item: SavedAccount }) => (
    <Pressable
      style={[styles.accountItem, { backgroundColor: sectionColor }]}
      onPress={() => handleAccountSelect(item)}
      disabled={isLoading}
    >
      <View style={styles.accountLeftContainer}>
        <View style={styles.accountAvatarContainer}>
          <LinearGradient
            colors={['#ff9a9e', '#fad0c4', '#fad0c4', '#fbc2eb', '#a18cd1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.accountAvatar}
          >
            {item.avatarConfig ? (
              <Avatar size={getResponsiveWidth(10)} {...item.avatarConfig} />
            ) : (
              <ThemedText style={styles.avatarPlaceholder}>
                {(item.displayName || item.userID).charAt(0).toUpperCase()}
              </ThemedText>
            )}
          </LinearGradient>
        </View>
        <ThemedText style={styles.accountName} numberOfLines={1}>
          {item.displayName || item.userID}
        </ThemedText>
      </View>
      <View style={styles.accountRightContainer}>
        <MaterialCommunityIcons
          name="chevron-right"
          size={getResponsiveWidth(5)}
          color={primaryColor}
        />
      </View>
    </Pressable>
  );

  // Loading indicator component
  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={primaryColor} />
      <ThemedText style={styles.loadingText}>
        {t('quickLoginScreen.loggingIn')}
      </ThemedText>
      {/* <ThemedButton
        label={t('quickLoginScreen.cancel')}
        onPress={handleCancelLogin}
      /> */}
    </View>
  );

  // Multiple accounts selection view
  const renderMultipleAccountsView = () => (
    <Animated.View style={[styles.multipleAccountsContainer, accountsViewStyle, isLoading ? { alignItems: 'center' } : {}]}>
      {isLoading ? renderLoading() : (
        <View>
          <ThemedText type='defaultSemiBold' style={styles.accountsTitle}>
            {t('quickLoginScreen.chooseAccount')}
          </ThemedText>
          <FlatList
            data={savedAccounts}
            renderItem={renderAccountItem}
            keyExtractor={(item) => item.userID}
            contentContainerStyle={styles.accountsListContent}
            style={{ gap: getResponsiveHeight(2), marginBottom: getResponsiveHeight(2.4) }}
          />
          <ThemedTextButton
            label={t('quickLoginScreen.useOtherAccount')}
            onPress={() => router.push('/login')}
            style={styles.otherAccountButton}
            disabled={isLoading}
          />
        </View>
      )}
    </Animated.View>
  );

  // Single account view
  const renderSingleAccountView = () => (
    <View style={styles.contentContainer}>

      <View style={styles.avatarContainer}>
        <LinearGradient
          colors={['#ff9a9e', '#fad0c4', '#fad0c4', '#fbc2eb', '#a18cd1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.accountAvatar}
        >
          {selectedAccount?.avatarConfig ? (
            <Avatar size={getResponsiveWidth(36)} {...selectedAccount.avatarConfig} />
          ) : (
            <ThemedText style={styles.largeAvatarPlaceholder}>
              {(selectedAccount?.displayName || selectedAccount?.userID || "").charAt(0).toUpperCase()}
            </ThemedText>
          )}
        </LinearGradient>
      </View>


      <ThemedText style={styles.displayName} numberOfLines={1}>
        {selectedAccount?.displayName || selectedAccount?.userID || savedUserID || t('quickLoginScreen.usernamePlaceholder')}
      </ThemedText>

      {isLoading ? renderLoading() : (
        <>
          <Animated.View style={[styles.passwordFieldContainer, passwordFieldStyle]}>
            <TextInput
              ref={passwordInputRef}
              style={[
                styles.passwordInput,
                {
                  color: textColor,
                  backgroundColor: inputBackgroundColor,
                }
              ]}
              placeholder={t('quickLoginScreen.passwordPlaceholder')}
              placeholderTextColor={currentTheme === 'light' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)'}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={handlePasswordLogin}
            />

            <ThemedButton
              label={t('quickLoginScreen.login')}
              onPress={handlePasswordLogin}
              style={styles.actionButton}
              textStyle={styles.buttonText}
            />
          </Animated.View>

          {!showPasswordField && (
            <ThemedButton
              label={t('quickLoginScreen.continue')}
              onPress={handleQuickLogin}
              style={styles.actionButton}
              textStyle={styles.buttonText}
            />
          )}

          {savedAccounts.length > 1 ? (
            <ThemedTextButton
              label={t('quickLoginScreen.switchAccount')}
              onPress={toggleAccountsView}
              style={styles.textButtonContainer}
              textStyle={styles.textButton}
            />
          ) : (
            <ThemedTextButton
              label={t('quickLoginScreen.useOtherAccount')}
              onPress={() => router.push('/login')}
              style={styles.textButtonContainer}
              textStyle={styles.textButton}
            />
          )}
        </>
      )}
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: currentTheme === 'light' ? Colors.light.background : Colors.dark.background,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <View style={styles.logoContainer}>
        <Logo size={getResponsiveWidth(3.5)} />
      </View>
      {showMultipleAccounts ? renderMultipleAccountsView() : renderSingleAccountView()}

      <View style={styles.bottomContainer}>
        <ThemedButton
          label={t('loginScreen.registerNow')}
          onPress={onNavigateToRegister}
          style={styles.registerButton}
          textStyle={styles.buttonText}
          variant='outline'
          disabled={isLoading}
        />
        <ThemedText type='defaultSemiBold' style={styles.appName}>
          {t('common.appName')}
        </ThemedText>
      </View>

      <ThemedToast
        duration={5000}
        message={errorMessage}
        isVisible={isToastVisible}
        onDismiss={onDismissToast}
        style={styles.toastContainer}
        iconName="error"
        onVisibilityToggle={setIsToastVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Main container styles
  container: {
    flex: 1,
    paddingHorizontal: getResponsiveWidth(3.6),
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
  },
  multipleAccountsContainer: {
    flex: 1,
    width: '100%',
  },

  // Logo styles
  logoContainer: {
    marginTop: getResponsiveHeight(10),
    marginBottom: getResponsiveHeight(6),
  },

  // Avatar styles for single account view
  avatarContainer: {
    width: getResponsiveWidth(40),
    aspectRatio: 1,
    borderRadius: getResponsiveWidth(20),
    overflow: 'hidden',
  },
  gradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: getResponsiveWidth(2),
    backgroundColor: 'red'
  },
  largeAvatarPlaceholder: {
    fontSize: getResponsiveFontSize(40),
    color: 'white',
    fontWeight: 'bold',
    lineHeight: getResponsiveFontSize(100),
  },

  // User display name
  displayName: {
    fontSize: getResponsiveFontSize(18),
    marginBottom: getResponsiveHeight(4),
    textAlign: 'center',
    maxWidth: '90%',
    marginTop: getResponsiveHeight(2),
  },

  // Password input
  passwordFieldContainer: {
    width: '100%',
    marginBottom: getResponsiveHeight(3),
  },
  passwordInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: getResponsiveWidth(12),
    paddingHorizontal: getResponsiveWidth(4),
    marginBottom: getResponsiveHeight(3),
    fontSize: getResponsiveFontSize(16),
  },

  // Button styles
  actionButton: {
    width: '100%',
    borderRadius: getResponsiveWidth(12),
    marginBottom: getResponsiveHeight(3),
  },
  buttonText: {
    fontSize: getResponsiveFontSize(16),
  },
  textButtonContainer: {
    marginTop: getResponsiveHeight(1),
    marginBottom: getResponsiveHeight(3),
    opacity: 0.7,
  },
  textButton: {
    // fontSize: getResponsiveFontSize(14),
  },

  // Account list styles
  accountsTitle: {
    fontSize: getResponsiveFontSize(16),
    marginBottom: getResponsiveHeight(3),
    textAlign: 'center',
  },
  accountsListContent: {
    flexGrow: 1,
    gap: getResponsiveHeight(2),
  },

  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: getResponsiveHeight(1.8),
    paddingHorizontal: getResponsiveWidth(4.8),
    borderRadius: getResponsiveWidth(4),
  },

  accountLeftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    flex: 1,
    justifyContent: 'flex-start',
  },

  accountRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',

  },
  accountAvatarContainer: {
    width: getResponsiveWidth(12),
    height: getResponsiveWidth(12),
    borderRadius: getResponsiveWidth(6),
    overflow: 'hidden',
    marginRight: getResponsiveWidth(3),
  },
  accountAvatar: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    fontSize: getResponsiveFontSize(16),
    color: 'white',
    fontWeight: 'bold',
  },
  accountName: {
    fontSize: getResponsiveFontSize(16),
    flex: 1,
  },

  // Loading indicator
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsiveHeight(4),
    flex: 0.8
  },
  loadingText: {
    marginTop: getResponsiveHeight(1),
    fontSize: getResponsiveFontSize(16),
  },

  // Bottom container styles
  bottomContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: Platform.OS === 'ios' ? getResponsiveHeight(2) : getResponsiveHeight(4),
  },
  registerButton: {
    width: '100%',
    borderRadius: getResponsiveWidth(12),
    marginBottom: getResponsiveHeight(2),
  },
  appName: {
    fontSize: getResponsiveFontSize(14),
    opacity: 0.7,
  },

  // Other account button for multiple accounts view
  otherAccountButton: {
    width: '100%',
    borderRadius: getResponsiveWidth(12),
    marginBottom: getResponsiveHeight(2),
    justifyContent: 'center',
    opacity: 0.7,
  },

  // Toast styles
  toastContainer: {
    position: 'absolute',
    bottom: getResponsiveHeight(2),
    left: getResponsiveWidth(5),
    right: getResponsiveWidth(5),
    zIndex: 999,
  }
});
