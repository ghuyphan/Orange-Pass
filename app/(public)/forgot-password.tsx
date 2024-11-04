import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Keyboard } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Formik } from 'formik';

import { ThemedView } from '@/components/ThemedView';
import { ThemedInput } from '@/components/Inputs/ThemedInput';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { ThemedToast } from '@/components/toast/ThemedToast';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { t } from '@/i18n';
import { forgotPasswordSchema } from '@/utils/validationSchemas';
import { forgot } from '@/services/auth';
import { ThemedText } from '@/components/ThemedText';
import { width, height } from '@/constants/Constants';

export default function ForgotPasswordScreen() {
  const colorScheme = useColorScheme();
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
          style={[{ backgroundColor: colorScheme === 'light' ? Colors.light.background : Colors.dark.background }]}
          contentContainerStyle={styles.container}
          extraScrollHeight={70}
          extraHeight={100}
          enableOnAndroid
          showsVerticalScrollIndicator={false}
          scrollEnabled={isKeyboardVisible}
        >
          <ThemedView style={styles.logoContainer}>
            <Image source={require('@/assets/images/orange-icon.png')} style={styles.orangeLogo} />
          </ThemedView>
          <ThemedText style={styles.title} type='defaultSemiBold'>{t('forgotPasswordScreen.forgotPassword')}</ThemedText>
          <ThemedInput
            label={t('forgotPasswordScreen.email')}
            placeholder={t('forgotPasswordScreen.emailPlaceholder')}
            onChangeText={handleChange('email')}
            isError={touched.email && errors.email ? true : false}
            onBlur={handleBlur('email')}
            value={values.email}
            errorMessage={touched.email && errors.email ? errors.email : ''}
          />
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
            iconName='information-circle'
          />
        </KeyboardAwareScrollView>
      )}
    </Formik >
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    marginHorizontal: 15,
    maxHeight: '130%',
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
  forgotButton: {
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
    bottom: 20,
    left: 0,
    right: 0,
  }
});
