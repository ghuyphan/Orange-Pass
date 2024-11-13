import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Keyboard } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Formik } from 'formik';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedInput } from '@/components/Inputs/ThemedInput';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { ThemedToast } from '@/components/toast/ThemedToast';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { t } from '@/i18n';
import { registrationSchema } from '@/utils/validationSchemas';
import { register } from '@/services/auth';
import { width, height } from '@/constants/Constants';
import {useLocale} from "@/context/LocaleContext";
import { genConfig } from '@zamplyy/react-native-nice-avatar';

export default function RegisterScreen() {
    const colorScheme = useColorScheme();
    const { locale } = useLocale();
    const [isToastVisible, setIsToastVisible] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

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
                        hatStyle: "none",
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
                    style={[{ backgroundColor: colorScheme === 'light' ? Colors.light.background : Colors.dark.background }]}
                    contentContainerStyle={styles.container}
                    extraScrollHeight={200}
                    scrollEnabled={isKeyboardVisible}
                    showsVerticalScrollIndicator={false}
                    enableOnAndroid
                >
                    <ThemedView style={styles.logoContainer}>
                        <Image source={require('@/assets/images/orange-icon.png')} style={styles.orangeLogo} />
                    </ThemedView>
                    <ThemedText style={styles.title} type='defaultSemiBold'>{t('registerScreen.registerNewAccount')}</ThemedText>
                    <ThemedInput
                        label={t('registerScreen.fullName')}
                        placeholder={t('registerScreen.fullNamePlaceholder')}
                        onChangeText={handleChange('fullName')}
                        isError={touched.fullName && errors.fullName ? true : false}
                        onBlur={handleBlur('fullName')}
                        value={values.fullName}
                        errorMessage={touched.fullName && errors.fullName ? errors.fullName : ''}
                    />
                    <ThemedInput
                        label={t('registerScreen.email')}
                        placeholder={t('registerScreen.emailPlaceholder')}
                        onChangeText={handleChange('email')}
                        isError={touched.email && errors.email ? true : false}
                        onBlur={handleBlur('email')}
                        value={values.email}
                        errorMessage={touched.email && errors.email ? errors.email : ''}
                    />
                    <ThemedInput
                        label={t('registerScreen.password')}
                        placeholder={t('registerScreen.passwordPlaceholder')}
                        secureTextEntry={true}
                        onChangeText={handleChange('password')}
                        isError={touched.password && errors.password ? true : false}
                        onBlur={handleBlur('password')}
                        value={values.password}
                        errorMessage={touched.password && errors.password ? errors.password : ''}
                    />
                    <ThemedInput
                        label={t('registerScreen.confirmPassword')}
                        placeholder={t('registerScreen.confirmPasswordPlaceholder')}
                        secureTextEntry={true}
                        onChangeText={handleChange('confirmPassword')}
                        isError={touched.confirmPassword && errors.confirmPassword ? true : false}
                        onBlur={handleBlur('registerScreen.confirmPassword')}
                        value={values.confirmPassword}
                        errorMessage={touched.confirmPassword && errors.confirmPassword ? errors.confirmPassword : ''}
                    />
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
                        iconName='alert-circle'
                    />
                </KeyboardAwareScrollView>
            )}
        </Formik>
    );
}

const styles = StyleSheet.create({
    container: {
        // flex: 1,
        flexGrow: 1,
        marginHorizontal: 15,
        maxHeight: '150%',
    },
    logoContainer: {
        alignItems: 'center',
        marginTop: 90,
        marginBottom: 10,
      },
      orangeLogo: {
        width: width * 0.3,
        height: height * 0.13,
        left: 0,
        right: 0,
        resizeMode: 'cover',
        marginBottom: 20,
      },
    title: {
        marginBottom: 20,
        fontSize: 22,
        textAlign: 'center',
    },
    registerButton: {
        marginTop: 20,
    },
    registerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
    },
    toastContainer: {
        position: 'absolute',
        bottom: 15,
        left: 0,
        right: 0,
        marginHorizontal: 15,
    }
});
