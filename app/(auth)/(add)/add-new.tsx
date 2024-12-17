import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import BottomSheet from '@gorhom/bottom-sheet';
import { Formik } from 'formik';
import { router } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';

import { Colors } from '@/constants/Colors';
import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import ThemedCardItem from '@/components/cards/ThemedCardItem';
import { ThemedInput, ThemedDisplayInput } from '@/components/Inputs';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import ThemedReuseableSheet from '@/components/bottomsheet/ThemedReusableSheet';
import { useTheme } from '@/context/ThemeContext';
import { t } from '@/i18n';
import { qrCodeSchema } from '@/utils/validationSchemas';
import { returnItemCodeByBin, returnItemData, returnItemsByType } from '@/utils/returnItemData';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
const AnimatedKeyboardAwareScrollView = Animated.createAnimatedComponent(KeyboardAwareScrollView);

const AddScreen: React.FC = () => {
  const { currentTheme: theme } = useTheme();

  const colors = useMemo(() => (theme === 'light' ? Colors.light.text : Colors.dark.text), [theme]);
  const sectionsColors = useMemo(() => (theme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground), [theme]);

  const [type, setType] = useState<'store' | 'bank' | 'ewallet'>('store');
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Important: This ref is likely used for controlling the bottom sheet
  const bottomSheetRef = useRef<BottomSheet>(null);

  const scrollY = useSharedValue(0);

  const { codeType, codeValue, codeBin } = useLocalSearchParams();
  const bankCode = useMemo(() => returnItemCodeByBin(codeBin), [codeBin]);
  const { name, full_name, color, accent_color } = useMemo(() => returnItemData(bankCode, "bank"), [bankCode, "bank"]);
  console.log(full_name.vi);


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
      zIndex: scrollY.value > 50 || isSheetOpen ? 0 : 1,
    };
  });

  const cardStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [0, 70],
      [0.8, 0.6],
      Extrapolation.CLAMP
    )
    const marginBottom = interpolate(
      scrollY.value,
      [0, 70],
      [15, -15],
      Extrapolation.CLAMP
    )
    return {
      transform: [{ scale }],
      marginBottom
    };
  });

  const onNavigateBack = useCallback(() => {
    router.back();
  }, []);

  const onOpenBottomSheet = useCallback(() => {
    setIsSheetOpen(true)
    if (Keyboard.isVisible()) {
      Keyboard.dismiss();
      // bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.expand();
    }
  }, [])

  useEffect(() => {
    const loadBanks = () => {
      const banks = returnItemsByType('bank');
    };
    setTimeout(() => {
      loadBanks();
    }, 500);
    // setIsLoadingBanks(false);

  }, []);

  const renderCardItem = (metadata: string) => {

    return (
      <ThemedCardItem
        code={bankCode || ''}
        type={'bank'}
        metadata={metadata || '1234'} // Use the metadata passed from Formik
        metadata_type={codeType === '256' ? 'qr' : 'barcode'}
        animatedStyle={cardStyle}
      />
    );
  };

  return (
    <Formik
      initialValues={{
        code: bankCode?.toString() || '',
        qr_index: '',
        metadata: codeValue?.toString() || '', // Initialize metadata with codeValue
        type: type?.toString() || '',
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

            <ThemedView style={{ justifyContent: 'center', backgroundColor: sectionsColors, borderRadius: 16 }}>
              <ThemedDisplayInput
                iconName='filter-variant'
                placeholder='Category'
                // label={t('addScreen.metadataLabel')}
                value={values.type}
                onPress={onOpenBottomSheet}
              />
              <ThemedDisplayInput
                iconName='format-text'
                placeholder='Brand'
                logoCode={values.code}
                // label={t('addScreen.metadataLabel')}
                value={name}
                onPress={onOpenBottomSheet}
              />
              <ThemedInput
                iconName='card-text-outline'
                placeholder={t('addScreen.metadataPlaceholder')}
                // label={t('addScreen.metadataLabel')}
                value={values.metadata}
                onChangeText={handleChange('metadata')}
                onBlur={handleBlur('metadata')}
                backgroundColor={sectionsColors}
                // style={{backgroundColor: sectionsColors}}
                // isError={true}
                // errorMessage='Error message'
                disabled={true}
              />

            </ThemedView>

            <ThemedButton
              label={t('addScreen.saveButton')}
              onPress={handleSubmit}
              style={styles.saveButton}
              disabled={isSubmitting}
            />
          </AnimatedKeyboardAwareScrollView>
          <ThemedReuseableSheet
            ref={bottomSheetRef}
            title='Category'
            snapPoints={['25%']}
            onClose={() => {
              setTimeout(() => {
                setIsSheetOpen(false)
              }, 50);
            }}
            contentType='flat'
          />
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
    paddingTop: STATUSBAR_HEIGHT + 85,
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
    // zIndex: 1,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: STATUSBAR_HEIGHT + 105,
  },
  saveButton: {
    marginTop: 20,
  },
  background: {
    backgroundColor: 'white',
  },
  handle: {
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
  },
  handleIndicator: {
    backgroundColor: 'gray',
  },
});