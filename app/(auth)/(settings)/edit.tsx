import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Keyboard, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Formik } from 'formik';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedInput } from '@/components/Inputs/ThemedInput';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { ThemedToast } from '@/components/toast/ThemedToast';
import { Colors } from '@/constants/Colors';
import { t } from '@/i18n';
// import { profileSchema } from '@/utils/validationSchemas';
// import { updateUserProfile } from '@/services/auth';
// import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';
import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    Easing,
    interpolate,
    Extrapolation,
    useAnimatedScrollHandler,
  } from 'react-native-reanimated';

const EditProfileScreen = () => {
    const { currentTheme: theme } = useTheme();
    const cardColor = theme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground;

    const [isToastVisible, setIsToastVisible] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const scrollY = useSharedValue(0);


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

    const onDismissToast = useCallback(() => {
        setIsToastVisible(false);
    }, []);

    const onNavigateBack = useCallback(() => {
        router.back();
    }, []);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
          scrollY.value = event.contentOffset.y;
        },
      });
    
      // Calculate these outside of the animated style
    const scrollThreshold = getResponsiveHeight(7);
    const translateYValue = -getResponsiveHeight(3.5);
    
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


    return (
        <Formik
            initialValues={{
                fullName: '',
                email: '',
                currentPassword: '',
                newPassword: '',
                confirmNewPassword: ''
            }}
            // validationSchema={profileSchema}
            onSubmit={async (values, { setSubmitting }) => {
                setSubmitting(true);
                try {
                    const updateData: { fullName?: string; email?: string; currentPassword?: string; newPassword?: string; } = {};

                    if (values.fullName !== user?.fullName) {
                        updateData.fullName = values.fullName;
                    }
                    if (values.email !== user?.email) {
                        updateData.email = values.email;
                    }

                    if (values.newPassword) {
                        updateData.currentPassword = values.currentPassword;
                        updateData.newPassword = values.newPassword;
                    }

                    if (Object.keys(updateData).length === 0) {
                        setIsToastVisible(true);
                        setErrorMessage(t('editProfileScreen.noChanges'));
                        setSubmitting(false); // Add this line
                        return;
                    }

                    await updateUserProfile(updateData, user?.token);
                    updateUser({ ...user, fullName: updateData.fullName || user.fullName, email: updateData.email || user.email });

                    setIsToastVisible(true);
                    setErrorMessage(t('editProfileScreen.updateSuccess'));
                    setTimeout(() => {
                        router.back();
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
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isSubmitting }) => (
                 <ThemedView style={styles.container}>
                    <ThemedView style={styles.blurContainer} />
                    <Animated.View style={[styles.titleContainer, titleContainerStyle]} pointerEvents="auto">
                        <View style={styles.headerContainer}>
                            <View style={styles.titleButtonContainer}>
                                <ThemedButton
                                    iconName="chevron-left"
                                    style={styles.titleButton}
                                    onPress={onNavigateBack}
                                />
                            </View>
                            <ThemedText style={styles.title} type="title">
                                {t('editProfileScreen.title')}
                            </ThemedText>
                        </View>
                    </Animated.View>
                    <KeyboardAwareScrollView
                        keyboardShouldPersistTaps="handled"
                        style={[styles.scrollContainer, {backgroundColor: theme === 'light' ? Colors.light.background : Colors.dark.background,}]}
                        contentContainerStyle={styles.scrollContentContainer}
                        extraScrollHeight={getResponsiveHeight(12)}
                        scrollEnabled={isKeyboardVisible}
                        showsVerticalScrollIndicator={false}
                        enableOnAndroid
                        onScroll={scrollHandler}
                        scrollEventThrottle={16}
                    >
                        <View style={[styles.sectionContainer, { backgroundColor: cardColor }]}>
                            <ThemedInput
                                label={t('editProfileScreen.fullName')}
                                placeholder={t('editProfileScreen.fullNamePlaceholder')}
                                onChangeText={handleChange('fullName')}
                                isError={touched.fullName && errors.fullName ? true : false}
                                onBlur={handleBlur('fullName')}
                                value={values.fullName}
                                errorMessage={
                                    touched.fullName && errors.fullName
                                        ? t(`editProfileScreen.errors.${errors.fullName}`)
                                        : ''
                                }
                                disabled={isSubmitting}
                                 disableOpacityChange={false}
                            />

                            <ThemedView style={styles.divider} />

                            <ThemedInput
                                label={t('editProfileScreen.email')}
                                placeholder={t('editProfileScreen.emailPlaceholder')}
                                onChangeText={handleChange('email')}
                                isError={touched.email && errors.email ? true : false}
                                onBlur={handleBlur('email')}
                                value={values.email}
                                errorMessage={
                                    touched.email && errors.email
                                        ? t(`editProfileScreen.errors.${errors.email}`)
                                        : ''
                                }
                                disabled={isSubmitting}
                                 disableOpacityChange={false}
                            />

                            <ThemedView style={styles.divider} />

                            <ThemedInput
                                label={t('editProfileScreen.currentPassword')}
                                placeholder={t('editProfileScreen.currentPasswordPlaceholder')}
                                secureTextEntry
                                onChangeText={handleChange('currentPassword')}
                                onBlur={handleBlur('currentPassword')}
                                value={values.currentPassword}
                                errorMessage={
                                    touched.currentPassword && errors.currentPassword
                                        ? t(`editProfileScreen.errors.${errors.currentPassword}`)
                                        : ''
                                }
                                disabled={isSubmitting}
                                 disableOpacityChange={false}
                            />
                            <ThemedView style={styles.divider} />
                            <ThemedInput
                                label={t('editProfileScreen.newPassword')}
                                placeholder={t('editProfileScreen.newPasswordPlaceholder')}
                                secureTextEntry
                                onChangeText={handleChange('newPassword')}
                                onBlur={handleBlur('newPassword')}
                                value={values.newPassword}
                                errorMessage={
                                    touched.newPassword && errors.newPassword
                                        ? t(`editProfileScreen.errors.${errors.newPassword}`)
                                        : ''
                                }
                                disabled={isSubmitting}
                                 disableOpacityChange={false}
                            />
                            <ThemedView style={styles.divider} />
                            <ThemedInput
                                label={t('editProfileScreen.confirmNewPassword')}
                                placeholder={t('editProfileScreen.confirmNewPasswordPlaceholder')}
                                secureTextEntry
                                onChangeText={handleChange('confirmNewPassword')}
                                onBlur={handleBlur('confirmNewPassword')}
                                value={values.confirmNewPassword}
                                errorMessage={
                                    touched.confirmNewPassword && errors.confirmNewPassword
                                        ? t(`editProfileScreen.errors.${errors.confirmNewPassword}`)
                                        : ''
                                }
                                disabled={isSubmitting}
                                 disableOpacityChange={false}
                            />

                        </View>
                            <ThemedButton
                                label={t('editProfileScreen.saveChanges')}
                                style={styles.saveButton}
                                onPress={handleSubmit}
                                loading={isSubmitting}
                                loadingLabel={t('editProfileScreen.saving')}
                            />

                        <ThemedToast
                            message={errorMessage}
                            isVisible={isToastVisible}
                            style={styles.toastContainer}
                            onDismiss={onDismissToast}
                            onVisibilityToggle={setIsToastVisible}
                            iconName="error" // or "check" for success
                        />
                    </KeyboardAwareScrollView>
                </ThemedView>
            )}
        </Formik>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
      },
      titleContainer: {
        position: 'absolute',
        top: getResponsiveHeight(10),
        left: 0,
        right: 0,
        zIndex:20,
      },
      headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: getResponsiveWidth(3.6),
        gap: getResponsiveWidth(3.6),
      },
      titleButtonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: getResponsiveWidth(3.6),
      },
      title: {
        fontSize: getResponsiveFontSize(28),
      },
      titleButton: {
        zIndex: 11,
      },
      blurContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: STATUSBAR_HEIGHT,
        zIndex: 10,
      },
    scrollContainer: {
        flexGrow: 1,
        paddingHorizontal: getResponsiveWidth(3.6),
        paddingTop: getResponsiveHeight(18), // Adjust as needed
      },
      scrollContentContainer: {
        paddingBottom: getResponsiveHeight(3.6), // Add padding to the bottom
      },
    sectionContainer: {
        borderRadius: getResponsiveWidth(4),
        overflow: 'hidden',
        paddingVertical: getResponsiveHeight(1.8),
        paddingHorizontal: getResponsiveWidth(4.8),
    },
    saveButton: {
        marginTop: getResponsiveHeight(2.4),
        marginBottom: getResponsiveHeight(3.6)

    },
    toastContainer: {
        position: 'absolute',
        bottom: getResponsiveHeight(3.6),
        left: 0,
        right: 0,
        marginHorizontal: getResponsiveWidth(3.6),
    },
    divider: {
        height: getResponsiveHeight(0.3),
        backgroundColor: Colors.dark.borderColor, // Or a color from your theme
        marginVertical: getResponsiveHeight(1.2),
    },
});

export default EditProfileScreen;