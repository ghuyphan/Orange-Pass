import React, { useState, useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Formik } from "formik";
import { router } from "expo-router";
import { useSelector, useDispatch } from "react-redux";

// Components
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import {
  ThemedInput,
  InputGroup,
  InputGroupError,
} from "@/components/Inputs/ThemedInput";
import { ThemedButton } from "@/components/buttons/ThemedButton";
import { ThemedToast } from "@/components/toast/ThemedToast";

// Utils and hooks
import { Colors } from "@/constants/Colors";
import { t } from "@/i18n";
import { passwordChangeSchema } from "@/utils/validationSchemas";
import { updateUserProfile } from "@/services/auth";
import { useTheme } from "@/context/ThemeContext";
import {
  getResponsiveFontSize,
  getResponsiveWidth,
  getResponsiveHeight,
} from "@/utils/responsive";
import { STATUSBAR_HEIGHT } from "@/constants/Statusbar";
import { RootState } from "@/store/rootReducer";
import { setAuthData } from "@/store/reducers/authSlice";

const ChangePasswordScreen = () => {
  const { currentTheme: theme } = useTheme();
  const dispatch = useDispatch();
  const token = useSelector((state: RootState) => state.auth.token);

  const [isToastVisible, setIsToastVisible] = useState(false);
  const [toastIcon, setToastIcon] = useState<"error" | "check">("error");
  const [errorMessage, setErrorMessage] = useState("");

  const onDismissToast = useCallback(() => setIsToastVisible(false), []);
  const onNavigateBack = useCallback(() => router.back(), []);

  const initialValues = useMemo(
    () => ({
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    }),
    []
  );

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={passwordChangeSchema}
      onSubmit={async (values, { setSubmitting }) => {
        setSubmitting(true);
        try {
          if (!token) {
            setToastIcon("error");
            setIsToastVisible(true);
            setErrorMessage(t("authRefresh.errors.invalidToken"));
            setSubmitting(false);
            return;
          }

          const updateData = {
            currentPassword: values.currentPassword,
            newPassword: values.newPassword,
          };

          const updatedUser = await updateUserProfile(updateData, token);
          dispatch(setAuthData({ token, user: updatedUser }));

          setToastIcon("check");
          setIsToastVisible(true);
          setErrorMessage(t("changePasswordScreen.updateSuccess"));
          setTimeout(() => {
            router.back();
          }, 1000);
        } catch (error) {
          setToastIcon("error");
          setIsToastVisible(true);
          setErrorMessage(
            error instanceof Error ? error.message : String(error)
          );
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
        const getGroupErrors = (): InputGroupError[] => {
          const activeErrors: InputGroupError[] = [];
          const fieldOrder: (keyof typeof values)[] = [
            "currentPassword",
            "newPassword",
            "confirmNewPassword",
          ];

          for (const field of fieldOrder) {
            if (touched[field] && errors[field]) {
              const fieldLabel = t(`changePasswordScreen.${field}`);
              activeErrors.push({
                inputId: fieldLabel.toLowerCase(),
                message: t(`changePasswordScreen.errors.${errors[field]}`),
                label: fieldLabel,
              });
            }
          }
          return activeErrors;
        };

        const inputGroupErrors = getGroupErrors();

        return (
          <ThemedView style={styles.container}>
            <ThemedView style={styles.blurContainer} />
            <View style={styles.headerContainer}>
              <View style={styles.titleButtonContainer}>
                <ThemedButton
                  iconName="chevron-left"
                  style={styles.titleButton}
                  onPress={onNavigateBack}
                />
              </View>
              <ThemedText style={styles.title} type="title">
                {t("changePasswordScreen.title")}
              </ThemedText>
            </View>
            <KeyboardAwareScrollView
              keyboardShouldPersistTaps="handled"
              style={[
                styles.scrollContainer,
                {
                  backgroundColor:
                    theme === "light"
                      ? Colors.light.background
                      : Colors.dark.background,
                },
              ]}
              contentContainerStyle={styles.scrollContentContainer}
              extraScrollHeight={getResponsiveHeight(12)}
              showsVerticalScrollIndicator={false}
              enableOnAndroid
            >
              <View style={[styles.sectionContainer]}>
                <InputGroup errors={inputGroupErrors}>
                  <ThemedInput
                    label={t("changePasswordScreen.currentPassword")}
                    placeholder={t(
                      "changePasswordScreen.currentPasswordPlaceholder"
                    )}
                    secureTextEntry
                    onChangeText={handleChange("currentPassword")}
                    onBlur={handleBlur("currentPassword")}
                    value={values.currentPassword}
                    disabled={isSubmitting}
                    disableOpacityChange={false}
                    groupPosition="top"
                  />
                  <ThemedInput
                    label={t("changePasswordScreen.newPassword")}
                    placeholder={t(
                      "changePasswordScreen.newPasswordPlaceholder"
                    )}
                    secureTextEntry
                    onChangeText={handleChange("newPassword")}
                    onBlur={handleBlur("newPassword")}
                    value={values.newPassword}
                    disabled={isSubmitting}
                    disableOpacityChange={false}
                    groupPosition="middle"
                  />
                  <ThemedInput
                    label={t("changePasswordScreen.confirmNewPassword")}
                    placeholder={t(
                      "changePasswordScreen.confirmNewPasswordPlaceholder"
                    )}
                    secureTextEntry
                    onChangeText={handleChange("confirmNewPassword")}
                    onBlur={handleBlur("confirmNewPassword")}
                    value={values.confirmNewPassword}
                    disabled={isSubmitting}
                    disableOpacityChange={false}
                    groupPosition="bottom"
                  />
                </InputGroup>
              </View>
              <ThemedButton
                label={t("changePasswordScreen.saveChanges")}
                style={styles.saveButton}
                onPress={() => handleSubmit()}
                loading={isSubmitting}
                loadingLabel={t("changePasswordScreen.saving")}
              />

              <ThemedToast
                message={errorMessage}
                isVisible={isToastVisible}
                style={styles.toastContainer}
                onDismiss={onDismissToast}
                onVisibilityToggle={setIsToastVisible}
                iconName={toastIcon}
              />
            </KeyboardAwareScrollView>
          </ThemedView>
        );
      }}
    </Formik>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: getResponsiveWidth(3.6),
    gap: getResponsiveWidth(3.6),
    marginTop: getResponsiveHeight(10),
    marginBottom: getResponsiveHeight(2),
  },
  titleButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: getResponsiveWidth(3.6),
  },
  title: {
    fontSize: getResponsiveFontSize(28),
  },
  titleButton: {
    zIndex: 11,
  },
  blurContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: STATUSBAR_HEIGHT,
    zIndex: 10,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: getResponsiveWidth(3.6),
  },
  scrollContentContainer: {
    paddingBottom: getResponsiveHeight(3.6),
  },
  sectionContainer: {
    borderRadius: getResponsiveWidth(4),
    overflow: "hidden",
    marginTop: getResponsiveHeight(2),
  },
  saveButton: {
    // marginTop: getResponsiveHeight(2.4),
    marginBottom: getResponsiveHeight(3.6),
  },
  toastContainer: {
    position: "absolute",
    bottom: getResponsiveHeight(3.6),
    left: 0,
    right: 0,
    marginHorizontal: getResponsiveWidth(3.6),
  },
});

export default ChangePasswordScreen;