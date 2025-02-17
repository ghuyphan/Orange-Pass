import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Keyboard } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Formik } from 'formik';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedInput } from '@/components/Inputs/ThemedInput';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { ThemedTextButton } from '@/components/buttons/ThemedTextButton';
import { ThemedToast } from '@/components/toast/ThemedToast';
import { Colors } from '@/constants/Colors';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/rootReducer';
import { t } from '@/i18n';
import { loginSchema } from '@/utils/validationSchemas';
import { login } from '@/services/auth';
import { useLocale } from '@/context/LocaleContext';
import LOGO from '@/assets/svgs/orange-logo.svg';
import { useTheme } from '@/context/ThemeContext';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';

export default function LoginScreen() {
  const { locale } = useLocale();
  const { currentTheme } = useTheme();
  const cardColor = currentTheme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground;
  const authRefreshError = useSelector((state: RootState) => state.error.message);
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
  }, [isKeyboardVisible]);

  useEffect(() => {
    if (authRefreshError !== null) {
      setIsToastVisible(true);
      setErrorMessage(authRefreshError);
    }
  }, [authRefreshError]);

  const onDismissToast = () => {
    setIsToastVisible(false);
  };

  const onNavigateToRegister = () => {
    Keyboard.dismiss();
    router.push('/register');
  };

  const onNavigateToForgot = () => {
    Keyboard.dismiss();
    router.push('/forgot-password');
  };

  return (
    <Formik
      initialValues={{ email: '', password: '' }}
      validationSchema={loginSchema}
      onSubmit={async (values, { setSubmitting }) => {
        setSubmitting(true);
        try {
          await login(values.email, values.password);
          router.replace('/(auth)/home');
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
          style={[{ backgroundColor: currentTheme === 'light' ? Colors.light.background : Colors.dark.background }]}
          contentContainerStyle={styles.container}
          extraScrollHeight={getResponsiveHeight(8.5)}
          extraHeight={getResponsiveHeight(24)}
          enableOnAndroid={true}
          showsVerticalScrollIndicator={false}
          scrollEnabled={isKeyboardVisible}
        >
          <View style={styles.topContainer}>
            <View style={styles.logoContainer}>
              <LOGO width={getResponsiveWidth(14)} height={getResponsiveWidth(14)} />
            </View>
            <ThemedText style={styles.title} type="title">
              {t('onboardingScreen.title')}
            </ThemedText>
          </View>
          <View style={[styles.inputContainer, { backgroundColor: cardColor }]}>
            <ThemedInput
              label={t('loginScreen.email')}
              placeholder={t('loginScreen.emailPlaceholder')}
              onChangeText={handleChange('email')}
              isError={touched.email && errors.email ? true : false}
              onBlur={handleBlur('email')}
              value={values.email}
              errorMessage={touched.email && errors.email ? t(`loginScreen.errors.${errors.email}`) : ''}
              disabled={isSubmitting}
              disableOpacityChange={true}
            />
            <ThemedView style={styles.divider} />
            <ThemedInput
              label={t('loginScreen.password')}
              placeholder={t('loginScreen.passwordPlaceholder')}
              secureTextEntry={true}
              onChangeText={handleChange('password')}
              isError={touched.password && errors.password ? true : false}
              onBlur={handleBlur('password')}
              value={values.password}
              errorMessage={touched.password && errors.password ? t(`loginScreen.errors.${errors.password}`) : ''}
              disabled={isSubmitting}
              disableOpacityChange={true}
            />
          </View>
          <View style={styles.forgotButton}>
            <ThemedTextButton label={t('loginScreen.forgotPassword')} onPress={onNavigateToForgot} />
          </View>
          <ThemedButton
            iconName="login"
            label={t('loginScreen.login')}
            style={styles.loginButton}
            onPress={handleSubmit}
            loadingLabel={t('loginScreen.loggingIn')}
            loading={isSubmitting}
          />
          <ThemedView style={styles.registerContainer}>
            <ThemedText>{t('loginScreen.dontHaveAnAccount')}</ThemedText>
            <ThemedTextButton label={t('loginScreen.registerNow')} onPress={onNavigateToRegister} />
          </ThemedView>
          <ThemedToast
            duration={5000}
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
    fontSize: getResponsiveFontSize(25),
  },
  inputContainer: {
    borderRadius: getResponsiveWidth(4),
    marginBottom: getResponsiveHeight(1.2),
    marginTop: getResponsiveHeight(3.6),
  },
  divider: {
    height: getResponsiveHeight(0.3),
  },
  forgotButton: {
    alignSelf: 'flex-end',

  },
  loginButton: {
    marginTop: getResponsiveHeight(3.6),
  },
  registerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: getResponsiveHeight(1.2),
    gap: getResponsiveWidth(1.2),
  },
  toastContainer: {
    position: 'absolute',
    bottom: getResponsiveHeight(1.8),
    left: 0,
    right: 0,
    marginHorizontal: getResponsiveWidth(3.6),
  },
});