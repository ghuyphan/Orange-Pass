import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Image, Keyboard, Platform, TextInput } from 'react-native'
// Removed Formik
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { ThemedToast } from '@/components/toast/ThemedToast';
import { Colors } from '@/constants/Colors';
import { t } from '@/i18n';
import { attemptAutoLogin } from '@/services/auth'; // Import attemptAutoLogin
import { useTheme } from '@/context/ThemeContext';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSavedEmail, getRememberMeStatus } from '@/services/auth';
import { Logo } from '@/components/AppLogo';
import { ThemedTextButton } from '@/components/buttons';

export default function QuickLoginScreen() {
    const { currentTheme } = useTheme();
    const [isToastVisible, setIsToastVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const insets = useSafeAreaInsets();
    const [savedEmail, setSavedEmail] = useState<string | null>(null);
    const [rememberMe, setRememberMe] = useState<boolean>(false);
    const [password, setPassword] = useState(''); // State for the password
    const [isLoading, setIsLoading] = useState(false); // State for loading indicator
    const passwordInputRef = useRef<TextInput>(null); // Ref for the password input


    useEffect(() => {
        const loadSavedCredentials = async () => {
            const email = await getSavedEmail();
            const remember = await getRememberMeStatus();
            setSavedEmail(email);
            setRememberMe(remember);

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


    return (
        <View style={[styles.container, { backgroundColor: currentTheme === 'light' ? Colors.light.background : Colors.dark.background, paddingTop: insets.top }]}>
            <View style={styles.contentContainer}>

                {/* Facebook Logo */}
                <View style={styles.logoContainer}>
                    <Logo size={getResponsiveWidth(3.5)} />
                </View>


                {/* Avatar Placeholder (Circular) */}
                <View style={styles.avatarContainer}>
                    {/*  You can replace the View with an Image if you have a default avatar */}
                    <View style={styles.avatarPlaceholder} />
                </View>

                {/* Username Placeholder (Centered) */}
                <ThemedText style={styles.usernamePlaceholder}>
                    {savedEmail || t('quickLoginScreen.usernamePlaceholder')}
                </ThemedText>

                {/* Password Input (Hidden) */}
                {/* <TextInput
                    ref={passwordInputRef}
                    style={styles.passwordInput} // Add the style
                    placeholder={t('quickLoginScreen.passwordPlaceholder')}
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    onSubmitEditing={handleLogin} // Trigger login on "Done" press
                    placeholderTextColor={currentTheme === 'light' ? Colors.light.placeholderText : Colors.dark.placeholderText}
                /> */}

                {/* Continue Button (Blue) */}
                <ThemedButton
                    label={t('quickLoginScreen.continue')}
                    onPress={handleLogin}
                    loading={isLoading}
                    loadingLabel={t('quickLoginScreen.loggingIn')}
                    style={styles.continueButton}
                    textStyle={styles.continueButtonText}
                />

                {/* Other Actions Container */}
                <View style={styles.otherActionsContainer}>
                    <ThemedTextButton
                        label={t('quickLoginScreen.useOtherAccount')} // "Use Other Account"
                        onPress={() => router.push('/login')} // Navigate to full login
                        style={styles.otherAccountButton}
                        textStyle={styles.otherAccountButtonText}
                    />
                </View>
            </View>

            {/* Footer */}
            <View style={styles.appNameContainer}>
                <ThemedButton
                    label={t('loginScreen.registerNow')}
                    onPress={onNavigateToRegister}
                    style={styles.createAccountButton}
                    textStyle={styles.createAccountButtonText}
                    outline
                />
                <ThemedText type='defaultSemiBold' style={styles.metaText}>{t('common.appName')}</ThemedText>
            </View>


            {/* Toast for errors (Keep this) */}
            <ThemedToast
                duration={5000}
                message={errorMessage}
                isVisible={isToastVisible}
                onDismiss={onDismissToast}
                style={styles.toastContainer}
                iconName="error"
                onVisibilityToggle={setIsToastVisible} //Keep it
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: getResponsiveWidth(3.6),
        justifyContent: 'space-between', // Distribute space between content and footer
    },
    contentContainer: {
        alignItems: 'center',
        marginTop: getResponsiveHeight(5),
    },
    logoContainer: {
        marginBottom: getResponsiveHeight(5.6),
        width: '100%', // Occupy full width
        alignItems: 'center',
    },
    logo: {
        width: getResponsiveWidth(15),  // Adjust as needed
        height: getResponsiveWidth(15), // Make it square
    },
    avatarContainer: {
        width: getResponsiveWidth(40),
        aspectRatio: 1,
        borderRadius: getResponsiveWidth(50),
        marginBottom: getResponsiveHeight(2),
        overflow: 'hidden',
        borderWidth: 1,
        // borderColor: Colors.light.borderColor,
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#ccc', // Placeholder color, similar to the image
        borderRadius: getResponsiveWidth(12.5), // Circular
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
        height: 0, // Make the input effectively hidden
        width: 0,
        opacity: 0,
        position: 'absolute', // Prevent it from affecting layout
    },
    continueButton: {
        width: '100%',
        height: getResponsiveHeight(6),
        marginBottom: getResponsiveHeight(2),
    },
    continueButtonText: {
        fontWeight: 'bold',
        fontSize: getResponsiveFontSize(16)
    },
    otherActionsContainer: {
        alignItems: 'center'
    },
    otherAccountButton: {

        // width: '100%',
        // height: getResponsiveHeight(6),
    },
    otherAccountButtonText: {
        fontWeight: 'bold',
        textAlign: 'center',
        opacity: 0.7,
    },
    footer: {
        alignItems: 'center',
    },
    appNameContainer: {
        alignItems: 'center',
        marginBottom: Platform.OS === 'ios' ? getResponsiveHeight(4) : getResponsiveHeight(3),
        paddingBottom: Platform.OS === 'android' ? getResponsiveHeight(1) : 0,
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
});