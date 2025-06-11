import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  StyleSheet,
  View,
  Keyboard,
  Pressable,
  Platform,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Formik } from "formik";
import { router } from "expo-router";
import { useSelector, useDispatch } from "react-redux";
import { useMMKVString } from "react-native-mmkv";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";

// Components
import { ThemedText } from "@/components/ThemedText";
import { ThemedInput } from "@/components/Inputs/ThemedInput";
import { ThemedButton } from "@/components/buttons/ThemedButton";
import { ThemedTextButton } from "@/components/buttons/ThemedTextButton";
import { ThemedToast } from "@/components/toast/ThemedToast";
import ThemedReuseableSheet from "@/components/bottomsheet/ThemedReusableSheet";
import { Logo } from "@/components/AppLogo";

// SVGs
import GB from "@/assets/svgs/GB.svg";
import VN from "@/assets/svgs/VN.svg";
import RU from "@/assets/svgs/RU.svg";

// Utils and hooks
import { Colors } from "@/constants/Colors";
import { RootState } from "@/store/rootReducer";
import { t } from "@/i18n";
import { loginSchema } from "@/utils/validationSchemas";
import {
  login,
  hasQuickLoginPreference,
  exitGuestMode,
  checkGuestModeStatus,
} from "@/services/auth";
import { transferGuestDataToUser } from "@/services/localDB/qrDB";
import { useLocale } from "@/context/LocaleContext";
import { useTheme } from "@/context/ThemeContext";
import {
  getResponsiveFontSize,
  getResponsiveWidth,
  getResponsiveHeight,
} from "@/utils/responsive";
import { setLoginInProgress } from "@/store/reducers/authStatusSlice";

// Types
type LanguageKey = "vi" | "ru" | "en";

// Pre-calculate flag sizes
const FLAG_WIDTH = getResponsiveWidth(7.2);
const FLAG_HEIGHT = getResponsiveHeight(3);

// Create language options
const createLanguageOptions = () => {
  return {
    vi: {
      label: "Tiếng Việt",
      flag: <VN width={FLAG_WIDTH} height={FLAG_HEIGHT} />,
    },
    ru: {
      label: "Русский",
      flag: <RU width={FLAG_WIDTH} height={FLAG_HEIGHT} />,
    },
    en: {
      label: "English",
      flag: <GB width={FLAG_WIDTH} height={FLAG_HEIGHT} />,
    },
  };
};

// Create styles
const createStyles = () => {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      paddingHorizontal: getResponsiveWidth(3.6),
      justifyContent: "space-between",
    },
    contentContainer: {
      flex: 1,
    },
    languageSelectorContainer: {
      alignItems: "center",
      marginTop: getResponsiveHeight(10),
    },
    logoContainer: {
      alignItems: "center",
      marginVertical: getResponsiveHeight(6),
    },
    inputsWrapper: {
      gap: getResponsiveHeight(2),
      width: "100%",
      marginBottom: getResponsiveHeight(2),
    },
    loginButton: {
      marginBottom: getResponsiveHeight(2),
    },
    loginButtonText: {},
    forgotButtonContainer: {
      alignItems: "center",
      marginBottom: getResponsiveHeight(4),
      marginTop: getResponsiveHeight(2),
    },
    createAccountButton: {
      borderRadius: getResponsiveWidth(8),
      width: "100%",
      marginBottom: getResponsiveHeight(2),
    },
    createAccountButtonText: {},
    appNameContainer: {
      alignItems: "center",
      marginBottom:
        Platform.OS === "ios"
          ? getResponsiveHeight(4)
          : getResponsiveHeight(3),
      paddingBottom: Platform.OS === "android" ? getResponsiveHeight(1) : 0,
    },
    metaText: {
      opacity: 0.7,
    },
    toastContainer: {
      position: "absolute",
      bottom: getResponsiveHeight(1.8),
      left: 0,
      right: 0,
      marginHorizontal: getResponsiveWidth(3.6),
    },
    flagIconContainer: {
      width: getResponsiveWidth(4.8),
      aspectRatio: 1,
      borderRadius: getResponsiveWidth(12),
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
    },
    languageOptionsContainer: {
      marginVertical: getResponsiveHeight(1),
      marginHorizontal: getResponsiveWidth(3.6),
      borderRadius: getResponsiveWidth(4),
    },
    languageOption: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderRadius: getResponsiveWidth(2),
      paddingHorizontal: getResponsiveWidth(4.8),
      paddingVertical: getResponsiveHeight(1.8),
    },
    pressedItem: {
      opacity: 0.7,
      backgroundColor:
        Platform.OS === "ios" ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.1)",
    },
    leftSectionContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: getResponsiveWidth(2.4),
    },
    iconStack: {
      position: "relative",
      justifyContent: "center",
      alignItems: "center",
      width: getResponsiveFontSize(18), // Ensure stack has a defined size
      height: getResponsiveFontSize(18), // Ensure stack has a defined size
    },
    checkIcon: {
      position: "absolute",
    },
  });
};

const styles = createStyles();
const languageOptionsData = createLanguageOptions();

export default function LoginScreen() {
  const { updateLocale } = useLocale();
  const [storedLocale, setStoredLocale] = useMMKVString("locale");
  const { currentTheme } = useTheme();
  const dispatch = useDispatch();

  const authRefreshError = useSelector(
    (state: RootState) => state.error.message
  );

  const [isToastVisible, setIsToastVisible] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false); // Kept for potential future use
  const [errorMessage, setErrorMessage] = useState("");

  const bottomSheetRef = useRef(null);
  const scrollViewRef = useRef(null); // Kept for potential future use

  const themeColors = useMemo(() => {
    const isLight = currentTheme === "light";
    return {
      backgroundColor: isLight
        ? Colors.light.background
        : Colors.dark.background,
      cardColor: isLight
        ? Colors.light.cardBackground
        : Colors.dark.cardBackground,
      iconColor: isLight ? Colors.light.icon : Colors.dark.icon,
      textColor: isLight ? Colors.light.text : Colors.dark.text,
    };
  }, [currentTheme]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  useEffect(() => {
    if (authRefreshError !== null) {
      setIsToastVisible(true);
      setErrorMessage(authRefreshError);
    }
  }, [authRefreshError]);

  const onDismissToast = useCallback(() => {
    setIsToastVisible(false);
  }, []);

  const onNavigateToRegister = useCallback(() => {
    Keyboard.dismiss();
    router.push("/register");
  }, []);

  const onNavigateToForgot = useCallback(() => {
    Keyboard.dismiss();
    router.push("/forgot-password");
  }, []);

  const handleLanguageChange = useCallback(
    (newLocale: LanguageKey) => {
      updateLocale(newLocale);
      setStoredLocale(newLocale);
      bottomSheetRef.current?.close();
    },
    [updateLocale, setStoredLocale]
  );

  const handleSystemLocale = useCallback(() => {
    updateLocale(undefined);
    setStoredLocale(undefined);
    bottomSheetRef.current?.close();
  }, [updateLocale, setStoredLocale]);

  const toggleLanguageDropdown = useCallback(() => {
    Keyboard.dismiss();
    bottomSheetRef.current?.expand();
  }, []);

  const handleFormSubmit = useCallback(
    async (values, { setSubmitting }) => {
      setSubmitting(true);
      dispatch(setLoginInProgress(true));

      try {
        const authData = await login(values.email, values.password);
        const newUserId = authData.record.id;

        const wasGuest = await checkGuestModeStatus();
        if (wasGuest) {
           (
            "[LoginScreen] User was guest, attempting to transfer data..."
          );
          try {
            await transferGuestDataToUser(newUserId);
             (
              "[LoginScreen] Guest data transfer successful."
            );
          } catch (transferError) {
            console.error(
              "[LoginScreen] Error during guest data transfer:",
              transferError
            );
          }
          const exitedSuccessfully = await exitGuestMode();
          if (exitedSuccessfully) {
             (
              "[LoginScreen] Successfully exited guest mode after login attempt."
            );
          } else {
            console.warn(
              "[LoginScreen] Failed to cleanly exit guest mode state. The GUEST_MODE_KEY might be stale."
            );
          }
        }

        const hasPreference = await hasQuickLoginPreference(newUserId);

        if (hasPreference) {
          router.replace("/(auth)/home");
        } else {
          router.replace("/(auth)/quick-login-prompt");
        }
      } catch (error) {
        const errorAsError = error as Error;
        setIsToastVisible(true);
        setErrorMessage(
          errorAsError.message || t("loginScreen.errors.genericError")
        );
      } finally {
        setSubmitting(false);
        dispatch(setLoginInProgress(false));
      }
    },
    [dispatch, t]
  );

  const languageOptionsContent = useMemo(() => {
    return (
      <View
        style={[
          styles.languageOptionsContainer,
          { backgroundColor: themeColors.cardColor },
        ]}
      >
        {Object.entries(languageOptionsData).map(([key, { label, flag }]) => (
          <Pressable
            key={key}
            onPress={() => handleLanguageChange(key as LanguageKey)}
            style={({ pressed }) => [
              styles.languageOption,
              pressed && styles.pressedItem,
            ]}
          >
            <View style={styles.leftSectionContainer}>
              <View style={styles.flagIconContainer}>{flag}</View>
              <ThemedText style={{ color: themeColors.textColor }}>
                {label}
              </ThemedText>
            </View>
            <View style={styles.iconStack}>
              <MaterialCommunityIcons
                name="circle-outline"
                size={getResponsiveFontSize(18)}
                color={themeColors.iconColor}
              />
              {storedLocale === key && (
                <MaterialIcons
                  name="circle"
                  size={getResponsiveFontSize(10)}
                  color={themeColors.iconColor}
                  style={styles.checkIcon}
                />
              )}
            </View>
          </Pressable>
        ))}
        <Pressable
          onPress={handleSystemLocale}
          style={({ pressed }) => [
            styles.languageOption,
            pressed && styles.pressedItem,
          ]}
        >
          <View style={styles.leftSectionContainer}>
            <MaterialCommunityIcons
              name="cog-outline"
              size={getResponsiveFontSize(18)}
              color={themeColors.iconColor}
            />
            <ThemedText style={{ color: themeColors.textColor }}>
              {t("languageScreen.system")}
            </ThemedText>
          </View>
          <View style={styles.iconStack}>
            <MaterialCommunityIcons
              name="circle-outline"
              size={getResponsiveFontSize(18)}
              color={themeColors.iconColor}
            />
            {storedLocale === undefined && (
              <MaterialIcons
                name="circle"
                size={getResponsiveFontSize(10)}
                color={themeColors.iconColor}
                style={styles.checkIcon}
              />
            )}
          </View>
        </Pressable>
      </View>
    );
  }, [
    themeColors,
    storedLocale,
    handleLanguageChange,
    handleSystemLocale,
    t,
  ]);

  const languageSelectorLabel = useMemo(() => {
    if (!storedLocale) return t("languageScreen.system");
    return (
      languageOptionsData[storedLocale as LanguageKey]?.label ||
      t("languageScreen.system")
    );
  }, [storedLocale, t]);

  return (
    <Formik
      initialValues={{ email: "", password: "" }}
      validationSchema={loginSchema}
      onSubmit={handleFormSubmit}
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
          style={{ backgroundColor: themeColors.backgroundColor }}
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
            <View style={styles.languageSelectorContainer}>
              <ThemedTextButton
                onPress={toggleLanguageDropdown}
                label={languageSelectorLabel}
                rightIconName="chevron-down"
              />
            </View>

            <View style={styles.logoContainer}>
              <Logo size={getResponsiveWidth(3.5)} />
            </View>

            <View style={styles.inputsWrapper}>
              <ThemedInput
                placeholder={t("loginScreen.email")}
                onChangeText={handleChange("email")}
                isError={touched.email && !!errors.email}
                onBlur={handleBlur("email")}
                value={values.email}
                errorMessage={
                  touched.email && errors.email
                    ? t(`loginScreen.errors.${errors.email}`)
                    : ""
                }
                disabled={isSubmitting}
                disableOpacityChange={false}
              />

              <ThemedInput
                placeholder={t("loginScreen.password")}
                secureTextEntry={true}
                onChangeText={handleChange("password")}
                isError={touched.password && !!errors.password}
                onBlur={handleBlur("password")}
                value={values.password}
                errorMessage={
                  touched.password && errors.password
                    ? t(`loginScreen.errors.${errors.password}`)
                    : ""
                }
                disabled={isSubmitting}
                disableOpacityChange={false}
              />
            </View>

            <ThemedButton
              label={t("loginScreen.login")}
              style={styles.loginButton}
              onPress={() => {
                Keyboard.dismiss();
                handleSubmit();
              }}
              loadingLabel={t("loginScreen.loggingIn")}
              loading={isSubmitting}
              textStyle={styles.loginButtonText}
              disabled={isSubmitting}
            />

            <View style={styles.forgotButtonContainer}>
              <ThemedTextButton
                label={t("loginScreen.forgotPassword")}
                onPress={onNavigateToForgot}
                style={{ opacity: 0.6 }}
                disabled={isSubmitting}
              />
            </View>
          </View>

          <View style={styles.appNameContainer}>
            <ThemedButton
              label={t("loginScreen.registerNow")}
              onPress={onNavigateToRegister}
              style={styles.createAccountButton}
              textStyle={styles.createAccountButtonText}
              outline
              disabled={isSubmitting}
            />
            <ThemedText type="defaultSemiBold" style={styles.metaText}>
              {t("common.appName")}
            </ThemedText>
          </View>

          <ThemedToast
            duration={5000}
            message={errorMessage}
            isVisible={isToastVisible}
            style={styles.toastContainer}
            onDismiss={onDismissToast}
            onVisibilityToggle={setIsToastVisible}
            iconName="error"
          />

          <ThemedReuseableSheet
            ref={bottomSheetRef}
            title={t("loginScreen.selectLanguage")}
            snapPoints={["40%"]} // Consider making this dynamic if content changes significantly
            showCloseButton={true}
            contentType="custom"
            customContent={languageOptionsContent}
          />
        </KeyboardAwareScrollView>
      )}
    </Formik>
  );
}
