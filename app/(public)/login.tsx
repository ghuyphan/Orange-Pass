import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
  lazy,
  Suspense,
} from "react";
import { StyleSheet, View, Keyboard, Pressable, Platform } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Formik } from "formik";
import { router } from "expo-router";
import { useSelector } from "react-redux";
import { useMMKVString } from "react-native-mmkv";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";

// Lazy-loaded components
const ThemedToast = lazy(() => import("@/components/toast/ThemedToast"));
const ThemedReuseableSheet = lazy(() =>
  import("@/components/bottomsheet/ThemedReusableSheet")
);

// Regular imports
import { ThemedText } from "@/components/ThemedText";
import { ThemedInput } from "@/components/Inputs/ThemedInput";
import { ThemedButton } from "@/components/buttons/ThemedButton";
import { ThemedTextButton } from "@/components/buttons/ThemedTextButton";
import { Colors } from "@/constants/Colors";
import { RootState } from "@/store/rootReducer";
import { t } from "@/i18n";
import { loginSchema } from "@/utils/validationSchemas";
import { login, hasQuickLoginPreference } from "@/services/auth";
import { useLocale } from "@/context/LocaleContext";
import { useTheme } from "@/context/ThemeContext";
import {
  getResponsiveFontSize,
  getResponsiveWidth,
  getResponsiveHeight,
} from "@/utils/responsive";
import { Logo } from "@/components/AppLogo";

// Flag components
const GB = lazy(() => import("@/assets/svgs/GB.svg"));
const VN = lazy(() => import("@/assets/svgs/VN.svg"));
const RU = lazy(() => import("@/assets/svgs/RU.svg"));

// Fallback component for lazy loading
const LoadingPlaceholder = () => <View />;

// Types
type LanguageKey = "vi" | "ru" | "en";

interface LanguageOption {
  label: string;
  flag: React.ReactNode;
}

export default function LoginScreen() {
  // Contexts and state
  const { locale, updateLocale } = useLocale();
  const [storedLocale, setStoredLocale] = useMMKVString("locale");
  const { currentTheme } = useTheme();
  const authRefreshError = useSelector(
    (state: RootState) => state.error.message
  );
  
  // UI state
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLanguageSheetReady, setIsLanguageSheetReady] = useState(false);
  
  // Refs
  const bottomSheetRef = useRef(null);
  const scrollViewRef = useRef(null);

  // Pre-calculate theme colors
  const backgroundColor =
    currentTheme === "light" ? Colors.light.background : Colors.dark.background;
  const cardColor =
    currentTheme === "light"
      ? Colors.light.cardBackground
      : Colors.dark.cardBackground;
  const iconColor =
    currentTheme === "light" ? Colors.light.icon : Colors.dark.icon;
  const textColor =
    currentTheme === "light" ? Colors.light.text : Colors.dark.text;

  // Create styles with pre-calculated responsive values
  const styles = useMemo(
    () => createStyles(currentTheme),
    [currentTheme]
  );

  // Lazy initialize language options
  const languageOptions = useMemo(() => {
    const flagSize = {
      width: getResponsiveWidth(7.2),
      height: getResponsiveHeight(3),
    };
    
    return {
      vi: {
        label: "Tiếng Việt",
        flag: (
          <Suspense fallback={<View style={flagSize} />}>
            <VN {...flagSize} />
          </Suspense>
        ),
      },
      ru: {
        label: "Русский",
        flag: (
          <Suspense fallback={<View style={flagSize} />}>
            <RU {...flagSize} />
          </Suspense>
        ),
      },
      en: {
        label: "English",
        flag: (
          <Suspense fallback={<View style={flagSize} />}>
            <GB {...flagSize} />
          </Suspense>
        ),
      },
    };
  }, []);

  // Keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => setKeyboardVisible(false)
    );

    // Defer loading the language sheet
    const timer = setTimeout(() => {
      setIsLanguageSheetReady(true);
    }, 500);

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
      clearTimeout(timer);
    };
  }, []);

  // Error handling
  useEffect(() => {
    if (authRefreshError !== null) {
      setIsToastVisible(true);
      setErrorMessage(authRefreshError);
    }
  }, [authRefreshError]);

  // Event handlers
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

  // Handle form submission
  const handleFormSubmit = useCallback(async (values, { setSubmitting }) => {
    setSubmitting(true);
    try {
      const authData = await login(values.email, values.password);
      const hasPreference = await hasQuickLoginPreference(authData.record.id);
      
      if (hasPreference) {
        router.replace("/(auth)/home");
      } else {
        router.replace("/(auth)/quick-login-prompt");
      }
    } catch (error) {
      const errorAsError = error as Error;
      setIsToastVisible(true);
      setErrorMessage(errorAsError.toString());
    } finally {
      setSubmitting(false);
    }
  }, []);

  // Memoized language options content
  const languageOptionsContent = useMemo(() => {
    return (
      <View style={[styles.languageOptionsContainer, { backgroundColor: cardColor }]}>
        {Object.entries(languageOptions).map(([key, { label, flag }]) => (
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
              <ThemedText style={{ color: textColor }}>{label}</ThemedText>
            </View>
            {storedLocale === key ? (
              <View style={styles.iconStack}>
                <MaterialCommunityIcons
                  name="circle-outline"
                  size={getResponsiveFontSize(18)}
                  color={iconColor}
                />
                <MaterialIcons
                  name="circle"
                  size={getResponsiveFontSize(10)}
                  color={iconColor}
                  style={styles.checkIcon}
                />
              </View>
            ) : (
              <MaterialCommunityIcons
                name="circle-outline"
                size={getResponsiveFontSize(18)}
                color={iconColor}
              />
            )}
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
              color={iconColor}
            />
            <ThemedText style={{ color: textColor }}>
              {t("languageScreen.system")}
            </ThemedText>
          </View>
          {storedLocale === undefined ? (
            <View style={styles.iconStack}>
              <MaterialCommunityIcons
                name="circle-outline"
                size={getResponsiveFontSize(18)}
                color={iconColor}
              />
              <MaterialIcons
                name="circle"
                size={getResponsiveFontSize(10)}
                color={iconColor}
                style={styles.checkIcon}
              />
            </View>
          ) : (
            <MaterialCommunityIcons
              name="circle-outline"
              size={getResponsiveFontSize(18)}
              color={iconColor}
            />
          )}
        </Pressable>
      </View>
    );
  }, [
    cardColor,
    textColor,
    iconColor,
    storedLocale,
    handleLanguageChange,
    handleSystemLocale,
  ]);

  // Memoized language selector button
  const LanguageSelectorButton = useMemo(() => (
    <View style={styles.languageSelectorContainer}>
      <ThemedTextButton
        onPress={toggleLanguageDropdown}
        label={
          storedLocale
            ? languageOptions[storedLocale as LanguageKey]?.label ||
              t("languageScreen.system")
            : t("languageScreen.system")
        }
        rightIconName="chevron-down"
      />
    </View>
  ), [toggleLanguageDropdown, storedLocale, languageOptions, t]);

  // Memoized logo component
  const LogoComponent = useMemo(() => (
    <View style={styles.logoContainer}>
      <Logo size={getResponsiveWidth(3.5)} />
    </View>
  ), [styles.logoContainer]);

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
      }) => {
        // Memoized form content
        const FormContent = useMemo(() => (
          <>
            <View style={styles.contentContainer}>
              {LanguageSelectorButton}
              {LogoComponent}

              <View style={styles.inputsWrapper}>
                <ThemedInput
                  placeholder={t("loginScreen.email")}
                  onChangeText={handleChange("email")}
                  isError={touched.email && errors.email ? true : false}
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
                  isError={touched.password && errors.password ? true : false}
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
          </>
        ), [
          t,
          values.email,
          values.password,
          touched.email,
          touched.password,
          errors.email,
          errors.password,
          isSubmitting,
          handleSubmit,
        ]);

        return (
          <KeyboardAwareScrollView
            ref={scrollViewRef}
            keyboardShouldPersistTaps="handled"
            style={{ backgroundColor }}
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
            {FormContent}

            {/* Toast for errors */}
            {isToastVisible && (
              <Suspense fallback={<LoadingPlaceholder />}>
                <ThemedToast
                  duration={5000}
                  message={errorMessage}
                  isVisible={isToastVisible}
                  style={styles.toastContainer}
                  onDismiss={onDismissToast}
                  onVisibilityToggle={setIsToastVisible}
                  iconName="error"
                />
              </Suspense>
            )}

            {/* Bottom Sheet for Language Selection */}
            {isLanguageSheetReady && (
              <Suspense fallback={<LoadingPlaceholder />}>
                <ThemedReuseableSheet
                  ref={bottomSheetRef}
                  title={t("loginScreen.selectLanguage")}
                  snapPoints={["40%"]}
                  showCloseButton={true}
                  contentType="custom"
                  customContent={languageOptionsContent}
                />
              </Suspense>
            )}
          </KeyboardAwareScrollView>
        );
      }}
    </Formik>
  );
}

// Separate style creation function to improve performance
function createStyles(currentTheme) {
  // Pre-calculate responsive values
  const responsiveHeight1 = getResponsiveHeight(1);
  const responsiveHeight2 = getResponsiveHeight(2);
  const responsiveHeight3 = getResponsiveHeight(3);
  const responsiveHeight4 = getResponsiveHeight(4);
  const responsiveHeight6 = getResponsiveHeight(6);
  const responsiveHeight10 = getResponsiveHeight(10);
  
  const responsiveWidth2 = getResponsiveWidth(2);
  const responsiveWidth2_4 = getResponsiveWidth(2.4);
  const responsiveWidth3_6 = getResponsiveWidth(3.6);
  const responsiveWidth4 = getResponsiveWidth(4);
  const responsiveWidth4_8 = getResponsiveWidth(4.8);
  const responsiveWidth8 = getResponsiveWidth(8);
  const responsiveWidth12 = getResponsiveWidth(12);

  return StyleSheet.create({
    container: {
      flexGrow: 1,
      paddingHorizontal: responsiveWidth3_6,
      justifyContent: "space-between",
    },
    contentContainer: {
      flex: 1,
    },
    languageSelectorContainer: {
      alignItems: "center",
      marginTop: responsiveHeight10,
    },
    logoContainer: {
      alignItems: "center",
      marginVertical: responsiveHeight6,
    },
    inputsWrapper: {
      gap: responsiveHeight2,
      width: "100%",
      marginBottom: responsiveHeight2,
    },
    loginButton: {
      marginBottom: responsiveHeight2,
    },
    loginButtonText: {},
    forgotButtonContainer: {
      alignItems: "center",
      marginBottom: responsiveHeight4,
      marginTop: responsiveHeight2,
    },
    createAccountButton: {
      borderRadius: responsiveWidth8,
      width: "100%",
      marginBottom: responsiveHeight2,
    },
    createAccountButtonText: {},
    appNameContainer: {
      alignItems: "center",
      marginBottom:
        Platform.OS === "ios" ? responsiveHeight4 : responsiveHeight3,
      paddingBottom: Platform.OS === "android" ? responsiveHeight1 : 0,
    },
    metaText: {
      opacity: 0.7,
    },
    toastContainer: {
      position: "absolute",
      bottom: responsiveHeight1,
      left: 0,
      right: 0,
      marginHorizontal: responsiveWidth3_6,
    },
    flagIconContainer: {
      width: responsiveWidth4_8,
      aspectRatio: 1,
      borderRadius: responsiveWidth12,
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
    },
    languageOptionsContainer: {
      marginVertical: responsiveHeight1,
      marginHorizontal: responsiveWidth3_6,
      borderRadius: responsiveWidth4,
    },
    languageOption: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderRadius: responsiveWidth2,
      paddingHorizontal: responsiveWidth4_8,
      paddingVertical: responsiveHeight2,
    },
    pressedItem: {
      opacity: 0.7,
      backgroundColor:
        Platform.OS === "ios" ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.1)",
    },
    leftSectionContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: responsiveWidth2_4,
    },
    iconStack: {
      position: "relative",
      justifyContent: "center",
      alignItems: "center",
    },
    checkIcon: {
      position: "absolute",
    },
  });
}
