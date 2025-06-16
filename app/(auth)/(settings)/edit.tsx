import React, { useEffect, useState, useCallback, useMemo } from "react";
import { StyleSheet, Keyboard, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Formik } from "formik";
import { router } from "expo-router";
import { useSelector, useDispatch } from "react-redux";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  interpolate,
  Extrapolation,
  useAnimatedScrollHandler,
} from "react-native-reanimated";
import * as Yup from "yup";

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
import { editProfileSchema } from "@/utils/validationSchemas";

// Types
import UserRecord from "@/types/userType";
const EditProfileScreen = () => {
  const { currentTheme: theme } = useTheme();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);

  const [isToastVisible, setIsToastVisible] = useState(false);
  const [toastIcon, setToastIcon] = useState<"error" | "check">("error");
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const scrollY = useSharedValue(0);

  useEffect(() => {
    const show = () => setKeyboardVisible(true);
    const hide = () => setKeyboardVisible(false);

    const showListener = Keyboard.addListener("keyboardDidShow", show);
    const hideListener = Keyboard.addListener("keyboardDidHide", hide);

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  const onDismissToast = useCallback(() => setIsToastVisible(false), []);
  const onNavigateBack = useCallback(() => router.back(), []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const scrollThreshold = useMemo(() => getResponsiveHeight(7), []);
  const translateYValue = useMemo(() => -getResponsiveHeight(3.5), []);

  const titleContainerStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [0, scrollThreshold],
      [0, translateYValue],
      Extrapolation.CLAMP
    );
    const opacity = withTiming(scrollY.value > scrollThreshold * 0.85 ? 0 : 1, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
    return {
      opacity,
      transform: [{ translateY }],
      zIndex: scrollY.value > scrollThreshold * 0.75 ? 0 : 20,
    };
  });

  const initialValues = useMemo(
    () => ({
      name: user?.name || "",
      email: user?.email || "",
    }),
    [user]
  );

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={editProfileSchema}
      onSubmit={async (values, { setSubmitting }) => {
        setSubmitting(true);
        try {
          const updateData: { name?: string; email?: string } = {};

          if (values.name !== user?.name) {
            updateData.name = values.name;
          }
          if (values.email !== user?.email) {
            updateData.email = values.email;
          }

          if (Object.keys(updateData).length === 0) {
            setToastIcon("error");
            setIsToastVisible(true);
            setErrorMessage(t("editProfileScreen.noChanges"));
            setSubmitting(false);
            return;
          }

          if (!token) {
            setToastIcon("error");
            setIsToastVisible(true);
            setErrorMessage(t("authRefresh.errors.invalidToken"));
            setSubmitting(false);
            return;
          }

          const updatedUser = await updateUserProfile(updateData, token);
          const userRecord: UserRecord = {
            ...user,
            ...updatedUser,
            username: updatedUser.username || user?.username || "",
            name: updatedUser.name || user?.name || "",
            email: updatedUser.email || user?.email || "",
            avatar: updatedUser.avatar || user?.avatar || null,
            verified: updatedUser.verified || user?.verified || null,
          };

          dispatch(setAuthData({ token, user: userRecord }));

          setToastIcon("check");
          setIsToastVisible(true);
          setErrorMessage(t("editProfileScreen.updateSuccess"));
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
          const fieldOrder: (keyof typeof values)[] = ["name", "email"];

          for (const field of fieldOrder) {
            if (touched[field] && errors[field]) {
              const fieldLabel = t(`editProfileScreen.${field}`);
              activeErrors.push({
                inputId: fieldLabel.toLowerCase(),
                message: t(`editProfileScreen.errors.${errors[field]}`),
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
            <Animated.View
              style={[styles.titleContainer, titleContainerStyle]}
              pointerEvents="auto"
            >
              <View style={styles.headerContainer}>
                <View style={styles.titleButtonContainer}>
                  <ThemedButton
                    iconName="chevron-left"
                    style={styles.titleButton}
                    onPress={onNavigateBack}
                  />
                </View>
                <ThemedText style={styles.title} type="title">
                  {t("editProfileScreen.title")}
                </ThemedText>
              </View>
            </Animated.View>
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
              scrollEnabled={isKeyboardVisible}
              showsVerticalScrollIndicator={false}
              enableOnAndroid
              onScroll={scrollHandler}
              scrollEventThrottle={16}
            >
              <View style={[styles.sectionContainer]}>
                <InputGroup errors={inputGroupErrors}>
                  <ThemedInput
                    label={t("editProfileScreen.name")}
                    placeholder={t("editProfileScreen.namePlaceholder")}
                    onChangeText={handleChange("name")}
                    onBlur={handleBlur("name")}
                    value={values.name}
                    disabled={isSubmitting}
                    disableOpacityChange={false}
                    groupPosition="top"
                  />
                  <ThemedInput
                    label={t("editProfileScreen.email")}
                    placeholder={t("editProfileScreen.emailPlaceholder")}
                    onChangeText={handleChange("email")}
                    onBlur={handleBlur("email")}
                    value={values.email}
                    disabled={isSubmitting}
                    disableOpacityChange={false}
                    groupPosition="bottom"
                    keyboardType="email-address"

                  />
                </InputGroup>
              </View>
              <ThemedButton
                label={t("editProfileScreen.saveChanges")}
                style={styles.saveButton}
                onPress={() => handleSubmit()}
                loading={isSubmitting}
                loadingLabel={t("editProfileScreen.saving")}
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
  titleContainer: {
    position: "absolute",
    top: getResponsiveHeight(10),
    left: 0,
    right: 0,
    zIndex: 20,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: getResponsiveWidth(3.6),
    gap: getResponsiveWidth(3.6),
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
    paddingTop: getResponsiveHeight(18),
  },
  scrollContentContainer: {
    paddingBottom: getResponsiveHeight(3.6),
  },
  sectionContainer: {
    borderRadius: getResponsiveWidth(4),
    overflow: "hidden",
    // marginBottom: getResponsiveHeight(2.4),
  },
  saveButton: {
    marginBottom: getResponsiveHeight(3.6),
  },
  toastContainer: {
    position: "absolute",
    bottom: getResponsiveHeight(3.6),
  },
});

export default EditProfileScreen;