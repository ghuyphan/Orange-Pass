import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View, Keyboard } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Formik } from 'formik';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedInput } from '@/components/Inputs/ThemedInput';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { ThemedTextButton } from '@/components/buttons/ThemedTextButton';
import { ThemedToast } from '@/components/toast/ThemedToast';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/rootReducer';
import { t } from '@/i18n';
import { loginSchema } from '@/utils/validationSchemas';
import { login } from '@/services/auth';
import { width, height } from '@/constants/Constants';
import { useLocale } from '@/context/LocaleContext';
import LOGO from '@/assets/svgs/orange-logo.svg';

export default function LoginScreen() {
  const { locale } = useLocale();
  const colorScheme = useColorScheme();
  const authRefreshError = useSelector((state: RootState) => state.error.message)
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
  }, [authRefreshError])

  const onDismissToast = () => {
    setIsToastVisible(false);
  };

  const onNavigateToRegister = () => {
    Keyboard.dismiss();
    router.push('/register');
  };

  const onNavigateToForgot = () => {
    Keyboard.dismiss();
    router.push('/forgot-password')
  }

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
          style={[{ backgroundColor: colorScheme === 'light' ? Colors.light.background : Colors.dark.background }]}
          contentContainerStyle={styles.container}
          extraScrollHeight={70}
          extraHeight={200}
          enableOnAndroid={true}
          showsVerticalScrollIndicator={false}
          scrollEnabled={isKeyboardVisible}
        >
          <ThemedView style={styles.logoContainer}>
            <LOGO width={width * 0.25} height={width * 0.25} style={styles.orangeLogo} />
            {/* <Image source={require('@/assets/images/orange-icon.png')} style={styles.orangeLogo} /> */}
          </ThemedView>
          <ThemedInput
            label={t('loginScreen.email')}
            placeholder={t('loginScreen.emailPlaceholder')}
            onChangeText={handleChange('email')}
            isError={touched.email && errors.email ? true : false}
            onBlur={handleBlur('email')}
            value={values.email}
            errorMessage={touched.email && errors.email ? errors.email : ''}
          />
          <ThemedInput
            label={t('loginScreen.password')}
            placeholder={t('loginScreen.passwordPlaceholder')}
            secureTextEntry={true}
            onChangeText={handleChange('password')}
            isError={touched.password && errors.password ? true : false}
            onBlur={handleBlur('password')}
            value={values.password}
            errorMessage={touched.password && errors.password ? errors.password : ''}
          />
          <View style={styles.forgotButton}>
            <ThemedTextButton
              label={t('loginScreen.forgotPassword')}
              onPress={onNavigateToForgot}
            />
          </View>
          <ThemedButton
            iconName='login'
            label={t('loginScreen.login')}
            style={styles.loginButton}
            onPress={handleSubmit}
            loadingLabel={t('loginScreen.loggingIn')}
            loading={isSubmitting}
          />
          <ThemedView style={styles.registerContainer}>
            <ThemedText>{t('loginScreen.dontHaveAnAccount')}</ThemedText>
            <ThemedTextButton
              label={t('loginScreen.registerNow')}
              onPress={onNavigateToRegister}
            />
          </ThemedView>
          <ThemedToast
            duration={5000}
            message={errorMessage}
            isVisible={isToastVisible}
            style={styles.toastContainer}
            onDismiss={onDismissToast}
            onVisibilityToggle={setIsToastVisible}
            iconName='alert-circle'
          />
        </KeyboardAwareScrollView>
      )}
    </Formik >
  );
}

const styles = StyleSheet.create({
  container: {
    // flex: 1,
    flexGrow: 1,
    marginHorizontal: 15,
    maxHeight: '120%',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 105,
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
  forgotButton: {
    alignSelf: 'flex-end',
  },
  loginButton: {
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
