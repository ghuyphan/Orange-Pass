import React, { useEffect, useState } from 'react';
import { StyleSheet, Keyboard, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Formik } from 'formik';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedInput } from '@/components/Inputs/ThemedInput';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { ThemedToast } from '@/components/toast/ThemedToast';
import { Colors } from '@/constants/Colors';
import { t } from '@/i18n';
import { registrationSchema } from '@/utils/validationSchemas';
import { register } from '@/services/auth';
import { useLocale } from '@/context/LocaleContext';
import { genConfig } from '@zamplyy/react-native-nice-avatar';
import LOGO from '@/assets/svgs/orange-logo.svg';
import { useTheme } from '@/context/ThemeContext';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';

export default function RegisterScreen() {
    const { currentTheme } = useTheme();
    const { locale } = useLocale();
    const [isToastVisible, setIsToastVisible] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const cardColor = currentTheme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground;

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
            setKeyboardVisible(true);
        });
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardVisible(false);
        });

        return () => {
            keyboardDidHideListener.remove();
            keyboardDidShowListener.remove();
        };
    }, []);

    const onDismissToast = () => {
        setIsToastVisible(false);
    };

    return (
        <Formik
            initialValues={{ fullName: '', email: '', password: '', confirmPassword: '', avatar: '' }}
            validationSchema={registrationSchema}
            onSubmit={async (values, { setSubmitting }) => {
                setSubmitting(true);
                try {
                    const avatarConfig = genConfig({
                        bgColor: '#FAFAFA',
                        hatStyle: 'none',
                        faceColor: '#F9C9B6',
                    });
                    const avatar = JSON.stringify(avatarConfig);
                    await register(values.fullName, values.email, values.password, values.confirmPassword, avatar);
                    setIsToastVisible(true);
                    setErrorMessage(t('registerScreen.registerSuccess'));
                    setTimeout(() => {
                        router.replace('/login');
                    }, 1000);
                } catch (error) {
                    const errorAsError = error as Error;
                    setIsToastVisible(true);
                    setErrorMessage(errorAsError.toString());
                } finally {
                    setSubmitting(false);
                }
            }}
        >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isSubmitting }) => (
                <KeyboardAwareScrollView
                    keyboardShouldPersistTaps="handled"
                    style={[
                        {
                            backgroundColor:
                                currentTheme === 'light' ? Colors.light.background : Colors.dark.background,
                        },
                    ]}
                    contentContainerStyle={styles.container}
                    extraScrollHeight={getResponsiveHeight(12)}
                    scrollEnabled={isKeyboardVisible}
                    showsVerticalScrollIndicator={false}
                    enableOnAndroid
                >
                    <View style={styles.topContainer}>
                        <View style={styles.logoContainer}>
                            <LOGO width={getResponsiveWidth(14)} height={getResponsiveWidth(14)} />
                        </View>
                        <ThemedText style={styles.title} type="title">
                            {t('registerScreen.registerNewAccount')}
                        </ThemedText>
                    </View>
                    <View style={[styles.inputContainer, { backgroundColor: cardColor }]}>
                        <ThemedInput
                            label={t('registerScreen.email')}
                            placeholder={t('registerScreen.emailPlaceholder')}
                            onChangeText={handleChange('email')}
                            isError={touched.email && errors.email ? true : false}
                            onBlur={handleBlur('email')}
                            value={values.email}
                            errorMessage={
                                touched.email && errors.email ? t(`registerScreen.errors.${errors.email}`) : ''
                            }
                            disabled={isSubmitting}
                            disableOpacityChange={true}
                            required={true}
                        />
                        <ThemedView style={styles.divider} />
                        <ThemedInput
                            label={t('registerScreen.fullName')}
                            placeholder={t('registerScreen.fullNamePlaceholder')}
                            onChangeText={handleChange('fullName')}
                            isError={touched.fullName && errors.fullName ? true : false}
                            onBlur={handleBlur('fullName')}
                            value={values.fullName}
                            errorMessage={
                                touched.fullName && errors.fullName
                                    ? t(`registerScreen.errors.${errors.fullName}`)
                                    : ''
                            }
                            disabled={isSubmitting}
                            disableOpacityChange={true}
                            required={true}
                        />
                        <ThemedView style={styles.divider} />
                        <ThemedInput
                            label={t('registerScreen.password')}
                            placeholder={t('registerScreen.passwordPlaceholder')}
                            secureTextEntry={true}
                            onChangeText={handleChange('password')}
                            isError={touched.password && errors.password ? true : false}
                            onBlur={handleBlur('password')}
                            value={values.password}
                            errorMessage={
                                touched.password && errors.password
                                    ? t(`registerScreen.errors.${errors.password}`)
                                    : ''
                            }
                            disabled={isSubmitting}
                            disableOpacityChange={true}
                            required={true}
                        />
                        <ThemedView style={styles.divider} />
                        <ThemedInput
                            label={t('registerScreen.confirmPassword')}
                            placeholder={t('registerScreen.confirmPasswordPlaceholder')}
                            secureTextEntry={true}
                            onChangeText={handleChange('confirmPassword')}
                            isError={touched.confirmPassword && errors.confirmPassword ? true : false}
                            onBlur={handleBlur('confirmPassword')}
                            value={values.confirmPassword}
                            errorMessage={
                                touched.confirmPassword && errors.confirmPassword
                                    ? t(`registerScreen.errors.${errors.confirmPassword}`)
                                    : ''
                            }
                            disabled={isSubmitting}
                            disableOpacityChange={true}
                            required={true}
                        />
                    </View>
                    <ThemedButton
                        label={t('registerScreen.register')}
                        style={styles.registerButton}
                        onPress={handleSubmit}
                        loading={isSubmitting}
                        loadingLabel={t('registerScreen.registering')}
                    />
                    <ThemedToast
                        message={errorMessage}
                        isVisible={isToastVisible}
                        style={styles.toastContainer}
                        onDismiss={onDismissToast}
                        onVisibilityToggle={setIsToastVisible}
                        iconName="error"
                    />
                </KeyboardAwareScrollView>
            )}
        </Formik>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        marginHorizontal: getResponsiveWidth(3.6),
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
        alignSelf: 'center',
    },
    title: {
        marginBottom: getResponsiveHeight(3.6),
        fontSize: getResponsiveFontSize(25),
        textAlign: 'center',
    },
    inputContainer: {
        borderRadius: getResponsiveWidth(4),
        marginBottom: getResponsiveHeight(2.4),
    },
    divider: {
        height: getResponsiveHeight(0.3),
    },
    registerButton: {
        marginTop: getResponsiveHeight(2.4),
    },
    registerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: getResponsiveHeight(2.4),
    },
    toastContainer: {
        position: 'absolute',
        bottom: getResponsiveHeight(3.6),
        left: 0,
        right: 0,
        marginHorizontal: getResponsiveWidth(3.6),
    },
});