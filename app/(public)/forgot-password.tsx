import React, { useEffect, useState } from 'react';
import { StyleSheet, Keyboard, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Formik } from 'formik';

import { ThemedView } from '@/components/ThemedView';
import { ThemedInput } from '@/components/Inputs/ThemedInput';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { ThemedToast } from '@/components/toast/ThemedToast';
import { Colors } from '@/constants/Colors';
import { t } from '@/i18n';
import { forgotPasswordSchema } from '@/utils/validationSchemas';
import { forgot } from '@/services/auth';
import { ThemedText } from '@/components/ThemedText';
import { useLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';
import { Logo } from '@/components/AppLogo';

export default function ForgotPasswordScreen() {
  const { currentTheme } = useTheme();
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { locale } = useLocale();

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
      initialValues={{ email: '' }}
      validationSchema={forgotPasswordSchema}
      onSubmit={async (values, { setSubmitting }) => {
        setSubmitting(true);
        try {
          await forgot(values.email);
          setIsToastVisible(true);
          setErrorMessage(t('forgotPasswordScreen.successMessage'));
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
          extraScrollHeight={getResponsiveHeight(8.5)}
          extraHeight={getResponsiveHeight(12)}
          enableOnAndroid
          showsVerticalScrollIndicator={false}
          scrollEnabled={isKeyboardVisible}
        >
          <View style={styles.topContainer}>
            <Logo size={getResponsiveWidth(4)}/>
            <ThemedText style={styles.title} type="title">
              {t('forgotPasswordScreen.forgotPassword')}
            </ThemedText>
          </View>
          <View style={styles.inputContainer}>
            <ThemedInput
              label={t('forgotPasswordScreen.email')}
              placeholder={t('forgotPasswordScreen.emailPlaceholder')}
              onChangeText={handleChange('email')}
              isError={touched.email && errors.email ? true : false}
              onBlur={handleBlur('email')}
              value={values.email}
              errorMessage={
                touched.email && errors.email ? t(`forgotPasswordScreen.errors.${errors.email}`) : ''
              }
              disabled={isSubmitting}
              disableOpacityChange={true}
            />
          </View>
          <ThemedButton
            label={t('forgotPasswordScreen.sendResetLink')}
            style={styles.forgotButton}
            onPress={handleSubmit}
            loadingLabel={t('forgotPasswordScreen.sendingResetLink')}
            loading={isSubmitting}
          />
          <ThemedToast
            message={errorMessage}
            isVisible={isToastVisible}
            style={styles.toastContainer}
            onDismiss={onDismissToast}
            onVisibilityToggle={setIsToastVisible}
            iconName="info"
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
  title: {
    fontSize: getResponsiveFontSize(25),
    textAlign: 'center',
  },
  inputContainer: {
    borderRadius: getResponsiveWidth(4),
    marginBottom: getResponsiveHeight(2.4),
    marginTop: getResponsiveHeight(3.6),
  },
  forgotButton: {
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
    bottom: getResponsiveHeight(1.8),
    left: 0,
    right: 0,
    marginHorizontal: getResponsiveWidth(3.6),
  },
});