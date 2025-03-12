import React, { useState, useRef, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Keyboard,
    Platform,
    TextInput,
    TouchableOpacity,
    FlatList,
    ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Avatar from '@zamplyy/react-native-nice-avatar';

import { ThemedText } from '@/components/ThemedText';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { ThemedToast } from '@/components/toast/ThemedToast';
import { ThemedTextButton } from '@/components/buttons';
import { Logo } from '@/components/AppLogo';
import { Colors } from '@/constants/Colors';
import { t } from '@/i18n';
import { attemptAutoLogin } from '@/services/auth';
import { useTheme } from '@/context/ThemeContext';
import { RootState } from '@/store/rootReducer';
import {
    getResponsiveFontSize,
    getResponsiveWidth,
    getResponsiveHeight
} from '@/utils/responsive';
import {
    getSavedEmail,
    getRememberMeStatus,
    //   getAllSavedAccounts 
} from '@/services/auth';
import { useLocale } from '@/context/LocaleContext';

// Define a type for saved accounts
interface SavedAccount {
    email: string;
    displayName?: string;
    avatarUrl?: string;
    avatarConfig?: any;
}

export default function QuickLoginScreen() {
    const { currentTheme } = useTheme();
    const [isToastVisible, setIsToastVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const insets = useSafeAreaInsets();
    const [savedEmail, setSavedEmail] = useState<string | null>(null);
    const [rememberMe, setRememberMe] = useState<boolean>(false);
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const passwordInputRef = useRef<TextInput>(null);
    const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<SavedAccount | null>(null);
    const [showMultipleAccounts, setShowMultipleAccounts] = useState(false);
    const { locale, updateLocale } = useLocale();

    // Get avatar config from Redux store
    const avatarConfig = useSelector((state: RootState) => state.auth.avatarConfig);

    useEffect(() => {
        const loadSavedCredentials = async () => {
            const email = await getSavedEmail();
            const remember = await getRememberMeStatus();
            const accounts = await getAllSavedAccounts();

            setSavedEmail(email);
            setRememberMe(remember);
            setSavedAccounts(accounts);

            // If there are multiple accounts, show the multiple accounts view
            if (accounts.length > 1) {
                setShowMultipleAccounts(true);
            } else if (accounts.length === 1) {
                setSelectedAccount(accounts[0]);
            }

            // If rememberMe is true, focus the password input automatically
            if (remember && email) {
                passwordInputRef.current?.focus();
            }
        };

        loadSavedCredentials();
    }, []);

    const onDismissToast = () => {
        setIsToastVisible(false);
    };

    const onNavigateToRegister = () => {
        Keyboard.dismiss();
        router.push('/register');
    };

    const handleLogin = async () => {
        Keyboard.dismiss();
        setIsLoading(true);
        setErrorMessage(''); // Clear any previous errors

        try {
            const loginSuccess = await attemptAutoLogin(password);
            if (loginSuccess) {
                router.replace('/(auth)/home');
            } else {
                // Handle the case where auto-login fails (e.g., wrong password)
                setErrorMessage(t('quickLoginScreen.errors.invalidCredentials'));
                setIsToastVisible(true);
            }
        } catch (error) {
            const errorAsError = error as Error;
            setErrorMessage(errorAsError.message); // Show detailed error
            setIsToastVisible(true);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAccountSelect = (account: SavedAccount) => {
        setSelectedAccount(account);
        setSavedEmail(account.email);
        setShowMultipleAccounts(false);
        // Focus password input after selecting account
        setTimeout(() => passwordInputRef.current?.focus(), 300);
    };

    const toggleAccountsView = () => {
        setShowMultipleAccounts(!showMultipleAccounts);
    };

    // Render a single account for the multiple accounts view
    const renderAccountItem = ({ item }: { item: SavedAccount }) => (
        <TouchableOpacity
            style={styles.accountItem}
            onPress={() => handleAccountSelect(item)}
        >
            <View style={styles.accountAvatarContainer}>
                <LinearGradient
                    colors={['#ff9a9e', '#fad0c4', '#fad0c4', '#fbc2eb', '#a18cd1']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.accountAvatar}
                >
                    {item.avatarConfig ? (
                        <Avatar size={getResponsiveWidth(12)} {...item.avatarConfig} />
                    ) : (
                        <View style={styles.avatarLoadContainer}>
                            <ActivityIndicator size={getResponsiveFontSize(6)} color="white" />
                        </View>
                    )}
                </LinearGradient>
            </View>
            <ThemedText style={styles.accountEmail}>{item.email}</ThemedText>
        </TouchableOpacity>
    );

    // Render the multiple accounts view
    const renderMultipleAccountsView = () => (
        <View style={styles.multipleAccountsContainer}>
            {/* Logo */}
            <View style={styles.logoContainer}>
                <Logo size={getResponsiveWidth(3.5)} />
            </View>

            <ThemedText style={styles.accountsTitle}>
                {t('quickLoginScreen.chooseAccount')}
            </ThemedText>

            <FlatList
                data={savedAccounts}
                renderItem={renderAccountItem}
                keyExtractor={(item) => item.email}
                contentContainerStyle={styles.accountsList}
            />

            <ThemedButton
                label={t('quickLoginScreen.useOtherAccount')}
                onPress={() => router.push('/login')}
                style={styles.otherAccountFullButton}
                textStyle={styles.otherAccountButtonText}
                outline
            />
        </View>
    );

    // Render the single account view
    const renderSingleAccountView = () => (
        <View style={styles.contentContainer}>
            {/* Logo */}
            <View style={styles.logoContainer}>
                <Logo size={getResponsiveWidth(3.5)} />
            </View>

            {/* Avatar */}
            <View style={styles.avatarContainer}>
                <LinearGradient
                    colors={['#ff9a9e', '#fad0c4', '#fad0c4', '#fbc2eb', '#a18cd1']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradient}
                >
                    {avatarConfig ? (
                        <Avatar size={getResponsiveWidth(40)} {...avatarConfig} />
                    ) : (
                        <View style={styles.avatarLoadContainer}>
                            <ActivityIndicator size={getResponsiveFontSize(20)} color="white" />
                        </View>
                    )}
                </LinearGradient>
            </View>

            {/* Username */}
            <ThemedText style={styles.usernamePlaceholder}>
                {savedEmail || t('quickLoginScreen.usernamePlaceholder')}
            </ThemedText>

            {/* Hidden Password Input */}
            <TextInput
                ref={passwordInputRef}
                style={styles.passwordInput}
                placeholder={t('quickLoginScreen.passwordPlaceholder')}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={handleLogin}
                placeholderTextColor={
                    currentTheme === 'light'
                        ? Colors.light.placeholderText
                        : Colors.dark.placeholderText
                }
            />

            {/* Continue Button */}
            <ThemedButton
                label={t('quickLoginScreen.continue')}
                onPress={handleLogin}
                loading={isLoading}
                loadingLabel={t('quickLoginScreen.loggingIn')}
                style={styles.continueButton}
                textStyle={styles.continueButtonText}
            />

            {/* Other Actions */}
            <View style={styles.otherActionsContainer}>
                {savedAccounts.length > 1 ? (
                    <ThemedTextButton
                        label={t('quickLoginScreen.switchAccount')}
                        onPress={toggleAccountsView}
                        style={styles.otherAccountButton}
                        textStyle={styles.otherAccountButtonText}
                    />
                ) : (
                    <ThemedTextButton
                        label={t('quickLoginScreen.useOtherAccount')}
                        onPress={() => router.push('/login')}
                        style={styles.otherAccountButton}
                        textStyle={styles.otherAccountButtonText}
                    />
                )}
            </View>
        </View>
    );

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor:
                        currentTheme === 'light'
                            ? Colors.light.background
                            : Colors.dark.background,
                    paddingTop: insets.top,
                },
            ]}
        >
            {/* Main Content - Either Multiple Accounts or Single Account View */}
            {showMultipleAccounts
                ? renderMultipleAccountsView()
                : renderSingleAccountView()}

            {/* Footer */}
            <View style={styles.appNameContainer}>
                <ThemedButton
                    label={t('loginScreen.registerNow')}
                    onPress={onNavigateToRegister}
                    style={styles.createAccountButton}
                    textStyle={styles.createAccountButtonText}
                    outline
                />
                <ThemedText type="defaultSemiBold" style={styles.metaText}>
                    {t('common.appName')}
                </ThemedText>
            </View>

            {/* Toast for errors */}
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
    container: {
        flex: 1,
        paddingHorizontal: getResponsiveWidth(3.6),
        justifyContent: 'space-between',
    },
    contentContainer: {
        flex: 1,
        alignItems: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        marginTop: getResponsiveHeight(10),
        marginBottom: getResponsiveHeight(6),
        width: '100%',
    },
    avatarContainer: {
        width: getResponsiveWidth(40),
        aspectRatio: 1,
        borderRadius: getResponsiveWidth(20),
        marginBottom: getResponsiveHeight(3),
        overflow: 'hidden',
    },
    gradient: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarLoadContainer: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    usernamePlaceholder: {
        fontSize: getResponsiveFontSize(20),
        fontWeight: '600',
        marginBottom: getResponsiveHeight(3),
        textAlign: 'center',
    },
    passwordInput: {
        height: 0,
        width: 0,
        opacity: 0,
        position: 'absolute',
    },
    continueButton: {
        width: '100%',
        height: getResponsiveHeight(6),
        marginBottom: getResponsiveHeight(2),
    },
    continueButtonText: {
        fontWeight: 'bold',
        fontSize: getResponsiveFontSize(16),
    },
    otherActionsContainer: {
        alignItems: 'center',
        marginTop: getResponsiveHeight(1),
    },
    otherAccountButton: {
        paddingVertical: getResponsiveHeight(1),
    },
    otherAccountButtonText: {
        fontWeight: 'bold',
        textAlign: 'center',
        opacity: 0.7,
        fontSize: getResponsiveFontSize(16),
    },
    appNameContainer: {
        alignItems: 'center',
        marginBottom: Platform.OS === 'ios' ? getResponsiveHeight(4) : getResponsiveHeight(3),
        paddingBottom: Platform.OS === 'android' ? getResponsiveHeight(1) : 0,
        width: '100%',
    },
    metaText: {
        fontSize: getResponsiveFontSize(16),
        opacity: 0.7,
    },
    createAccountButton: {
        borderRadius: getResponsiveWidth(8),
        height: getResponsiveHeight(6),
        width: '100%',
        marginBottom: getResponsiveHeight(2),
    },
    createAccountButtonText: {
        fontSize: getResponsiveFontSize(16),
        fontWeight: 'bold',
    },
    toastContainer: {
        position: 'absolute',
        bottom: getResponsiveHeight(1.8),
        left: 0,
        right: 0,
        marginHorizontal: getResponsiveWidth(3.6),
    },

    // Multiple accounts view styles
    multipleAccountsContainer: {
        flex: 1,
        width: '100%',
    },
    accountsTitle: {
        fontSize: getResponsiveFontSize(22),
        fontWeight: 'bold',
        marginBottom: getResponsiveHeight(3),
        textAlign: 'center',
    },
    accountsList: {
        paddingBottom: getResponsiveHeight(2),
    },
    accountItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: getResponsiveHeight(1.5),
        paddingHorizontal: getResponsiveWidth(2),
        borderRadius: getResponsiveWidth(2),
        marginBottom: getResponsiveHeight(1),
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
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
    accountEmail: {
        fontSize: getResponsiveFontSize(16),
        flex: 1,
    },
    otherAccountFullButton: {
        width: '100%',
        height: getResponsiveHeight(6),
        marginTop: getResponsiveHeight(2),
    },
});
