import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Keyboard, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Formik } from 'formik';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedInput } from '@/components/Inputs/ThemedInput';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { ThemedToast } from '@/components/toast/ThemedToast';
import { Colors } from '@/constants/Colors';
import { t } from '@/i18n';
import { registrationSchema } from '@/utils/validationSchemas';
import { register } from '@/services/auth';
import { useLocale } from '@/context/LocaleContext';
import { genConfig } from '@zamplyy/react-native-nice-avatar';
import { useTheme } from '@/context/ThemeContext';
import {
  getResponsiveFontSize,
  getResponsiveWidth,
  getResponsiveHeight,
} from '@/utils/responsive';
import { Logo } from '@/components/AppLogo';

export default function RegisterScreen() {
  const { locale } = useLocale();
  const { currentTheme } = useTheme();
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const scrollViewRef = useRef<KeyboardAwareScrollView>(null);

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
      initialValues={{
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        avatar: '',
      }}
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
          await register(
            values.fullName,
            values.email,
            values.password,
            values.confirmPassword,
            avatar
          );
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
      {({
        handleChange,
        handleBlur,
        handleSubmit,
        values,
        errors,
        touched,
        isSubmitting,
      }) => (
        <KeyboardAwareScrollView
          ref={scrollViewRef}
          keyboardShouldPersistTaps="handled"
          style={{
            backgroundColor:
              currentTheme === 'light'
                ? Colors.light.background
                : Colors.dark.background,
          }}
          contentContainerStyle={styles.container}
          extraScrollHeight={
            Platform.OS === 'ios' ? getResponsiveHeight(4) : 0
          }
          enableOnAndroid={true}
          enableResetScrollToCoords={false}
          showsVerticalScrollIndicator={false}
          scrollEnabled={true}
          keyboardOpeningTime={0}
        >
          <View style={styles.contentContainer}>
            {/* Placeholder for spacing to match login screen */}
            {/* <View style={styles.spacerContainer} /> */}
            <ThemedText type='defaultSemiBold' style={styles.title}>{t('registerScreen.registerNewAccount')}</ThemedText>

            {/* Logo Centered */}
            <View style={styles.logoContainer}>
              <Logo size={getResponsiveWidth(3.5)} />
            </View>

            {/* Input Fields */}
            <View style={styles.inputsWrapper}>
              <ThemedInput
                placeholder={t('registerScreen.email')}
                onChangeText={handleChange('email')}
                isError={touched.email && errors.email ? true : false}
                onBlur={handleBlur('email')}
                value={values.email}
                errorMessage={
                  touched.email && errors.email
                    ? t(`registerScreen.errors.${errors.email}`)
                    : ''
                }
                disabled={isSubmitting}
                 disableOpacityChange={false}
              />

              <ThemedInput
                placeholder={t('registerScreen.fullName')}
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
                 disableOpacityChange={false}
              />

              <ThemedInput
                placeholder={t('registerScreen.password')}
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
                 disableOpacityChange={false}
              />

              <ThemedInput
                placeholder={t('registerScreen.confirmPassword')}
                secureTextEntry={true}
                onChangeText={handleChange('confirmPassword')}
                isError={
                  touched.confirmPassword && errors.confirmPassword
                    ? true
                    : false
                }
                onBlur={handleBlur('confirmPassword')}
                value={values.confirmPassword}
                errorMessage={
                  touched.confirmPassword && errors.confirmPassword
                    ? t(`registerScreen.errors.${errors.confirmPassword}`)
                    : ''
                }
                disabled={isSubmitting}
                 disableOpacityChange={false}
              />
            </View>

            {/* Register Button */}
            <ThemedButton
              label={t('registerScreen.register')}
              style={styles.registerButton}
              onPress={() => {
                Keyboard.dismiss();
                handleSubmit();
              }}
              loading={isSubmitting}
              loadingLabel={t('registerScreen.registering')}
              textStyle={styles.registerButtonText}
            />
          </View>

          {/* Toast for errors/success */}
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
    paddingHorizontal: getResponsiveWidth(3.6),
  },
  contentContainer: {
    flex: 1,
  },
  title:{
    fontSize: getResponsiveFontSize(16),
    marginTop: getResponsiveHeight(10),
    textAlign: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: getResponsiveHeight(6),
    marginBottom: getResponsiveHeight(6),
  },
  inputsWrapper: {
    gap: getResponsiveHeight(2),
    width: '100%',
    marginBottom: getResponsiveHeight(2),
  },
  registerButton: {
 
  },
  registerButtonText: {
  },
  toastContainer: {
    position: 'absolute',
    bottom: getResponsiveHeight(1.8),
    left: 0,
    right: 0,
    marginHorizontal: getResponsiveWidth(3.6),
  },
});
