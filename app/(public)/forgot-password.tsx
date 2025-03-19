import React, { useEffect, useState, useRef } from "react";
import { StyleSheet, Keyboard, View, TextInput } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Formik } from "formik";

import { ThemedView } from "@/components/ThemedView";
import { ThemedInput } from "@/components/Inputs/ThemedInput";
import { ThemedButton } from "@/components/buttons/ThemedButton";
import { ThemedToast } from "@/components/toast/ThemedToast";
import { Colors } from "@/constants/Colors";
import { t } from "@/i18n";
import { forgotPasswordSchema } from "@/utils/validationSchemas";
import { forgot } from "@/services/auth";
import { ThemedText } from "@/components/ThemedText";
import { useLocale } from "@/context/LocaleContext";
import { useTheme } from "@/context/ThemeContext";
import {
  getResponsiveFontSize,
  getResponsiveWidth,
  getResponsiveHeight,
} from "@/utils/responsive";
import { Logo } from "@/components/AppLogo";

export default function ForgotPasswordScreen() {
  const { currentTheme } = useTheme();
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const inputRef = useRef<TextInput | null>(null);

  const { locale } = useLocale();

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
      }
    );

    // Focus the input when component mounts
    if (inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100); // Small delay to ensure component is fully mounted
    }

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
      initialValues={{ email: "" }}
      validationSchema={forgotPasswordSchema}
      onSubmit={async (values, { setSubmitting }) => {
        setSubmitting(true);
        try {
          await forgot(values.email);
          setIsToastVisible(true);
          setErrorMessage(t("forgotPasswordScreen.successMessage"));
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
          keyboardShouldPersistTaps="handled"
          style={{
            backgroundColor:
              currentTheme === "light"
                ? Colors.light.background
                : Colors.dark.background,
          }}
          contentContainerStyle={styles.container}
          extraScrollHeight={getResponsiveHeight(8.5)}
          extraHeight={getResponsiveHeight(12)}
          enableOnAndroid
          showsVerticalScrollIndicator={false}
          scrollEnabled={isKeyboardVisible}
        >
          <View style={styles.contentContainer}>
            {/* Spacer to match language selector height */}
            <ThemedText type='defaultSemiBold' style={styles.title}>{t('forgotPasswordScreen.forgotPassword')}</ThemedText>

            {/* Logo Centered */}
            <View style={styles.logoContainer}>
              <Logo size={getResponsiveWidth(3.5)} />
            </View>

            <View style={styles.inputContainer}>
              <ThemedInput
                placeholder={t("forgotPasswordScreen.email")}
                onChangeText={handleChange("email")}
                isError={touched.email && errors.email ? true : false}
                onBlur={handleBlur("email")}
                value={values.email}
                errorMessage={
                  touched.email && errors.email
                    ? t(`forgotPasswordScreen.errors.${errors.email}`)
                    : ""
                }
                disabled={isSubmitting}
                 disableOpacityChange={false}
                ref={inputRef}
              />
            </View>

            <ThemedButton
              label={t("forgotPasswordScreen.sendResetLink")}
              style={styles.forgotButton}
              onPress={handleSubmit}
              loadingLabel={t("forgotPasswordScreen.sendingResetLink")}
              loading={isSubmitting}
              textStyle={styles.buttonText}
            />
          </View>

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
  spacerContainer: {
    height: getResponsiveHeight(10), // Match the height of the language selector area
  },
  logoContainer: {
    alignItems: "center",
    marginTop: getResponsiveHeight(6),
    marginBottom: getResponsiveHeight(6),
  },
  inputContainer: {
    marginBottom: getResponsiveHeight(2.4),
  },
  forgotButton: {
 
    marginBottom: getResponsiveHeight(2),
  },
  buttonText: {
    fontWeight: "bold",
  },
  toastContainer: {
    position: "absolute",
    bottom: getResponsiveHeight(1.8),
    left: 0,
    right: 0,
    marginHorizontal: getResponsiveWidth(3.6),
  },
});
