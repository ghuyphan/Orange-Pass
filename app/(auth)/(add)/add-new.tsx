import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolation,
  useAnimatedScrollHandler
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { t } from '@/i18n';
import { Colors } from '@/constants/Colors';
import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';
import { useTheme } from '@/context/ThemeContext';
import { useLocalSearchParams } from 'expo-router';
import { ThemedInput } from '@/components/Inputs';
import { Formik } from 'formik';
import { qrCodeSchema } from '@/utils/validationSchemas';
import ThemedCardItem from '@/components/cards/ThemedCardItem';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const AnimatedKeyboardAwareScrollView = Animated.createAnimatedComponent(KeyboardAwareScrollView);

const AddScreen: React.FC = () => {
  const scrollY = useSharedValue(0);
  const { codeType, codeValue } = useLocalSearchParams();
  const [type, setType] = useState<'store' | 'bank' | 'ewallet'>('store');

  const { currentTheme: theme } = useTheme();
  const colors = useMemo(() => (theme === 'light' ? Colors.light.text : Colors.dark.text), [theme]);
  const sectionsColors = useMemo(() => (
    theme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground
  ), [theme]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const titleContainerStyle = useAnimatedStyle(() => {
    const scrollThreshold = 70;
    const animationRange = 50;

    const opacity = interpolate(
      scrollY.value,
      [scrollThreshold, scrollThreshold + animationRange],
      [1, 0],
      Extrapolation.CLAMP
    );

    const translateY = interpolate(
      scrollY.value,
      [0, scrollThreshold],
      [0, -30],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ translateY }],
      zIndex: scrollY.value > 50 ? 0 : 1,
    };
  });

  const cardStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [0, 70],
      [1, 0.8],
      Extrapolation.CLAMP
    )
    return {
      transform: [{ scale }],
    };
  });

  const onNavigateBack = useCallback(() => {
    router.back();
  }, []);

  const renderCardItem = (metadata: string) => {

    return (
      <ThemedCardItem
        code=''
        type={'bank'}
        metadata={metadata || '1234'} // Use the metadata passed from Formik
        metadata_type={codeType === '256' ? 'qr' : 'barcode'}
        animatedStyle={cardStyle}
        style={{ marginBottom: 30 }}
      />
    );
  };

  return (
    <Formik
      initialValues={{
        code: codeValue?.toString() || '',
        qr_index: '',
        metadata: codeValue?.toString() || '', // Initialize metadata with codeValue
        type: codeType?.toString() || '',
        metadata_type: 'qr',
        account_name: '',
        account_number: '',
      }}
      validationSchema={qrCodeSchema}
      onSubmit={async (values, { setSubmitting }) => {
        setSubmitting(true);
        try {
          console.log('Saving:', values);
          router.replace('/(auth)/home');
        } catch (error) {
          console.error(error);
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isSubmitting }) => (
        <ThemedView style={styles.container}>
          <Animated.View style={[styles.titleContainer, titleContainerStyle]} pointerEvents="auto">
            <View style={styles.headerContainer}>
              <View style={styles.titleButtonContainer}>
                <ThemedButton
                  iconName="chevron-left"
                  style={styles.titleButton}
                  onPress={onNavigateBack}
                />
              </View>
              <ThemedText style={styles.title} type="title">{t('addScreen.title')}</ThemedText>
            </View>
          </Animated.View>
          <AnimatedKeyboardAwareScrollView
            contentContainerStyle={[styles.scrollViewContent]}
            enableOnAndroid={true}
            extraScrollHeight={50}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScroll={scrollHandler}
            scrollEnabled={true}
          >
            {renderCardItem(values.metadata)}
            <ThemedInput
              iconName='card-text-outline'
              placeholder={t('addScreen.metadataPlaceholder')}
              label={t('addScreen.metadataLabel')}
              value={values.metadata}
              onChangeText={handleChange('metadata')}
              onBlur={handleBlur('metadata')}
              error={touched.metadata && errors.metadata}
              // disabled={codeValue?.toString() !== ''}
            />

            <ThemedButton
              label={t('addScreen.saveButton')}
              onPress={handleSubmit}
              style={styles.saveButton}
              disabled={isSubmitting}
            />
          </AnimatedKeyboardAwareScrollView>
        </ThemedView>
      )}
    </Formik>
  );
}

export default React.memo(AddScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    maxHeight: '130%',
    paddingHorizontal: 15,
    paddingTop: STATUSBAR_HEIGHT + 105,
  },
  titleContainer: {
    position: 'absolute',
    top: STATUSBAR_HEIGHT + 45,
    left: 0,
    right: 0,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    gap: 15,
  },
  titleButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  title: {
    fontSize: 28,
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
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: STATUSBAR_HEIGHT + 105,
  },
  saveButton: {
    marginTop: 20,
  },
});