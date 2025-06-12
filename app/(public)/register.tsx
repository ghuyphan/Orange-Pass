import React, { useEffect, useState, useRef } from "react";
import { StyleSheet, View, Keyboard, Platform } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Formik } from "formik";
import { router } from "expo-router";

import { ThemedText } from "@/components/ThemedText";
import {
  ThemedInput,
  InputGroup,
  InputGroupError,
} from "@/components/Inputs/ThemedInput";
import { ThemedButton } from "@/components/buttons/ThemedButton";
import { ThemedToast } from "@/components/toast/ThemedToast";
import { Colors } from "@/constants/Colors";
import { t } from "@/i18n";
import { registrationSchema } from "@/utils/validationSchemas";
import { register } from "@/services/auth";
import { useLocale } from "@/context/LocaleContext";
import { genConfig } from "@zamplyy/react-native-nice-avatar";
import { useTheme } from "@/context/ThemeContext";
import {
  getResponsiveFontSize,
  getResponsiveWidth,
  getResponsiveHeight,
} from "@/utils/responsive";
import { Logo } from "@/components/AppLogo";

export default function RegisterScreen() {
  const { locale } = useLocale();
  const { currentTheme } = useTheme();
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const scrollViewRef = useRef<KeyboardAwareScrollView>(null);

  const onDismissToast = () => {
    setIsToastVisible(false);
  };

  return (
    <Formik
      initialValues={{
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
        avatar: "",
      }}
      validationSchema={registrationSchema}
      onSubmit={async (values, { setSubmitting }) => {
        setSubmitting(true);
        try {
          const avatarConfig = genConfig({
            bgColor: "#FAFAFA",
            hatStyle: "none",
            faceColor: "#F9C9B6",
          });
          const avatar = JSON.stringify(avatarConfig);
          await register(
            values.fullName,
            values.email,
            values.password,
            values.confirmPassword,
            avatar
          );
          setToastMessage(t("registerScreen.registerSuccess"));
          setIsToastVisible(true);
          setTimeout(() => {
            router.replace("/login");
          }, 1000);
        } catch (error) {
          const errorAsError = error as Error;
          setToastMessage(errorAsError.toString());
          setIsToastVisible(true);
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
      }) => {
        // --- New: Transform Formik errors for the InputGroup component ---
        const getGroupErrors = (): InputGroupError[] => {
          const activeErrors: InputGroupError[] = [];
          const fieldOrder: (keyof typeof values)[] = [
            "email",
            "fullName",
            "password",
            "confirmPassword",
          ];

          for (const field of fieldOrder) {
            if (touched[field] && errors[field]) {
              const fieldLabel = t(`registerScreen.${field}`);
              activeErrors.push({
                // The inputId must match the ThemedInput's label prop, lowercased.
                inputId: fieldLabel.toLowerCase(),
                // The translated error message from the validation schema.
                message: t(`registerScreen.errors.${errors[field]}`),
                // The user-friendly, translated label for display in the error list.
                label: fieldLabel,
              });
            }
          }
          return activeErrors;
        };

        const inputGroupErrors = getGroupErrors();
        // --- End of new error transformation logic ---

        return (
          <KeyboardAwareScrollView
            ref={scrollViewRef}
            keyboardShouldPersistTaps="handled"
            style={{
              backgroundColor:
                currentTheme === "light"
                  ? Colors.light.background
                  : Colors.dark.background,
            }}
            contentContainerStyle={styles.container}
            extraScrollHeight={
              Platform.OS === "ios" ? getResponsiveHeight(4) : 0
            }
            enableOnAndroid={true}
            enableResetScrollToCoords={false}
            showsVerticalScrollIndicator={false}
            scrollEnabled={true}
            keyboardOpeningTime={0}
          >
            <View style={styles.contentContainer}>
              <ThemedText type="defaultSemiBold" style={styles.title}>
                {t("registerScreen.registerNewAccount")}
              </ThemedText>

              <View style={styles.logoContainer}>
                <Logo size={getResponsiveWidth(3.5)} />
              </View>

              {/* --- Updated: Input fields are now wrapped in InputGroup --- */}
              <View style={styles.inputsWrapper}>
                <InputGroup errors={inputGroupErrors}>
                  <ThemedInput
                    label={t("registerScreen.email")}
                    onChangeText={handleChange("email")}
                    onBlur={handleBlur("email")}
                    value={values.email}
                    keyboardType="email-address"
                    disabled={isSubmitting}
                    disableOpacityChange={false}
                    groupPosition="top"
                  />

                  <ThemedInput
                    label={t("registerScreen.fullName")}
                    onChangeText={handleChange("fullName")}
                    onBlur={handleBlur("fullName")}
                    value={values.fullName}
                    disabled={isSubmitting}
                    disableOpacityChange={false}
                    groupPosition="middle"
                  />

                  <ThemedInput
                    label={t("registerScreen.password")}
                    secureTextEntry={true}
                    onChangeText={handleChange("password")}
                    onBlur={handleBlur("password")}
                    value={values.password}
                    disabled={isSubmitting}
                    disableOpacityChange={false}
                    groupPosition="middle"
                  />

                  <ThemedInput
                    label={t("registerScreen.confirmPassword")}
                    secureTextEntry={true}
                    onChangeText={handleChange("confirmPassword")}
                    onBlur={handleBlur("confirmPassword")}
                    value={values.confirmPassword}
                    disabled={isSubmitting}
                    disableOpacityChange={false}
                    groupPosition="bottom"
                  />
                </InputGroup>
              </View>
              {/* --- End of updated input section --- */}

              <ThemedButton
                label={t("registerScreen.register")}
                style={styles.registerButton}
                onPress={() => {
                  Keyboard.dismiss();
                  handleSubmit();
                }}
                loading={isSubmitting}
                loadingLabel={t("registerScreen.registering")}
                textStyle={styles.registerButtonText}
              />
            </View>

            <ThemedToast
              duration={5000}
              message={toastMessage}
              isVisible={isToastVisible}
              style={styles.toastContainer}
              onDismiss={onDismissToast}
              onVisibilityToggle={setIsToastVisible}
              iconName="error"
            />
          </KeyboardAwareScrollView>
        );
      }}
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
  title: {
    fontSize: getResponsiveFontSize(16),
    marginTop: getResponsiveHeight(10),
    textAlign: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginTop: getResponsiveHeight(6),
    marginBottom: getResponsiveHeight(6),
  },
  inputsWrapper: {
    width: "100%",
  },
  registerButton: {
    marginTop: getResponsiveHeight(2),
  },
  registerButtonText: {},
  toastContainer: {
    position: "absolute",
    bottom: getResponsiveHeight(1.8),
    left: 0,
    right: 0,
    marginHorizontal: getResponsiveWidth(3.6),
  },
});