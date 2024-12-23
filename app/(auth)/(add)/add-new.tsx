import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, StyleSheet, View, Pressable, ListRenderItemInfo } from 'react-native';
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
import ThemedReuseableSheet, { BottomSheetAction } from '@/components/bottomsheet/ThemedReusableSheet';
import { useTheme } from '@/context/ThemeContext';
import { t } from '@/i18n';
import { qrCodeSchema } from '@/utils/validationSchemas';
import { returnItemCodeByBin, returnItemData, returnItemsByType } from '@/utils/returnItemData';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const AnimatedKeyboardAwareScrollView = Animated.createAnimatedComponent(KeyboardAwareScrollView);

type SheetType = 'category' | 'brand' | null;

interface CategoryItem {
  display: string;
  value: 'store' | 'bank' | 'ewallet';
}

const AddScreen: React.FC = () => {
  const { currentTheme: theme } = useTheme();

  // Memoized colors based on the current theme
  const colors = useMemo(() => (theme === 'light' ? Colors.light.text : Colors.dark.text), [theme]);
  const iconColors = useMemo(() => (theme === 'light' ? Colors.light.icon : Colors.dark.icon), [theme]);
  const sectionsColors = useMemo(() => (theme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground), [theme]);

  const [type, setType] = useState<{ display: string; value: 'store' | 'bank' | 'ewallet' } | null>(null); // Initialize type to null
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetType, setSheetType] = useState<SheetType>(null);

  // Ref for controlling the bottom sheet
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Shared value for scroll position
  const scrollY = useSharedValue(0);

  // Getting parameters from local search
  const { codeFormat, codeValue, codeBin, codeType, codeProvider } = useLocalSearchParams();
  // console.log(codeFormat, codeValue, codeBin, codeType, codeProvider);

  // Only look up bankCode if codeType is not 'ewallet'
  const bankCode = useMemo(() => {
    if (codeType !== 'ewallet') {
      return returnItemCodeByBin(codeBin);
    }
    return null;
  }, [codeBin, codeType]);
  
  // Determine the item code based on type
  const itemCode = useMemo(() => {
    if (codeType === 'ewallet') {
      return codeProvider;
    } else {
      return bankCode;
    }
  }, [codeType, codeProvider, bankCode]);
  
  // Get item data based on the determined item code and type
  const { name, full_name, color, accent_color } = useMemo(() => {
      return returnItemData(itemCode);
  }, [itemCode, codeType]);

  // Set initial type based on codeType parameter only if it exists
  useEffect(() => {
    if (codeType) {
      const typeMap: { [key: string]: { display: string; value: 'store' | 'bank' | 'ewallet' } } = {
        store: { display: 'Cửa hàng', value: 'store' },
        bank: { display: 'Ngân hàng', value: 'bank' },
        ewallet: { display: 'Ví điện tử', value: 'ewallet' },
      };
      const newType = typeMap[codeType.toString().toLowerCase()];
      if (newType) {
        setType(newType);
      }
    }
  }, [codeType]);

  // Scroll handler for animations
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Animated style for the title container
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

  // Animated style for the card
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

  // Callback for navigating back
  const onNavigateBack = useCallback(() => {
    router.back();
  }, []);

  const onOpenSheet = useCallback((type: SheetType) => {
    setIsSheetOpen(true)
    setSheetType(type);
    bottomSheetRef.current?.snapToIndex(0);
    if (Keyboard.isVisible()) {
      Keyboard.dismiss();
    } else {
      setSheetType(type);
      bottomSheetRef.current?.snapToIndex(0);
    }
  }, [])

  // Effect for loading banks
  useEffect(() => {
    const loadBanks = () => {
      const banks = returnItemsByType('bank');
    };
    setTimeout(() => {
      loadBanks();
    }, 500);
  }, []);

  const renderCardItem = (metadata: string) => {
    return (
      <ThemedCardItem
        code={itemCode} // Use the determined item code
        type={type?.value || 'store'} // Provide a default value if type is null
        metadata={metadata || '1234'}
        metadata_type={codeFormat === '256' ? 'qr' : 'barcode'}
        animatedStyle={cardStyle}
      />
    );
  };

  // Data for the category selection
  const categoryData: CategoryItem[] = [
    { display: 'Cửa hàng', value: 'store' },
    { display: 'Ngân hàng', value: 'bank' },
    { display: 'Ví điện tử', value: 'ewallet' },
  ];

  const renderCategoryItem = ({ item }: ListRenderItemInfo<CategoryItem>) => {
    return (
      <Pressable
        key={item.value}
        onPress={() => {
          setType(item);
          bottomSheetRef.current?.close();
          setTimeout(() => {
            setIsSheetOpen(false)
          }, 50);
        }}
        style={[
          styles.categoryItem,
        ]}
        android_ripple={{
          color: theme === 'light'
            ? 'rgba(0, 0, 0, 0.2)'
            : 'rgba(255, 255, 255, 0.2)',
          foreground: true,
          borderless: false
        }}
      >
        <MaterialCommunityIcons color={iconColors} size={18} name={item.value === 'store' ? 'store-outline' : item.value === 'bank' ? 'bank-outline' : 'wallet-outline'} />
        <ThemedText style={styles.categoryItemText}>{item.display}</ThemedText>
      </Pressable>
    );
  };

  // Update the handleClearCategory to also reset the type to null
  const handleClearCategory = useCallback(() => {
    setType(null);
  }, []);

  return (
    <Formik
      initialValues={{
        code: bankCode?.toString() || '',
        qr_index: '',
        metadata: codeValue?.toString() || '',
        type: type?.value || '', // Store the underlying value, handle null
        metadata_type: 'qr',
        account_name: '',
        account_number: '',
      }}
      validationSchema={qrCodeSchema}
      onSubmit={async (values, { setSubmitting }) => {
        setSubmitting(true);
        try {
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
          {/* Title Container */}
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

          {/* Scrollable Content */}
          <AnimatedKeyboardAwareScrollView
            contentContainerStyle={[styles.scrollViewContent]}
            enableOnAndroid={true}
            extraScrollHeight={50}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScroll={scrollHandler}
            scrollEnabled={true}
          >
            {/* Card Item */}
            {renderCardItem(values.metadata)}

            {/* Form Inputs */}
            <ThemedView style={{ justifyContent: 'center', backgroundColor: sectionsColors, borderRadius: 16 }}>
              <ThemedDisplayInput
                iconName='filter-variant'
                placeholder='Category'
                value={type?.display} // Display the user-friendly value, handle null
                onPress={() => onOpenSheet('category')}
                onClear={handleClearCategory} // Use the updated handleClearCategory
              // disabled={!!codeType}
              />
              <ThemedDisplayInput
                iconName='format-text'
                placeholder='Brand'
                logoCode={values.code}
                value={name}
                onPress={() => onOpenSheet('brand')}
                onClear={() => {

                }}
              // disabled={!!codeBin}
              />
              <ThemedInput
                iconName='card-text-outline'
                placeholder={t('addScreen.metadataPlaceholder')}
                value={values.metadata}
                onChangeText={handleChange('metadata')}
                onBlur={handleBlur('metadata')}
                backgroundColor={sectionsColors}
                disabled={!!codeValue}

              />
            </ThemedView>

            {/* Save Button */}
            <ThemedButton
              label={t('addScreen.saveButton')}
              onPress={handleSubmit}
              style={styles.saveButton}
              disabled={isSubmitting}
            />
          </AnimatedKeyboardAwareScrollView>

          {/* Bottom Sheet */}
          <ThemedReuseableSheet
            ref={bottomSheetRef}
            title={
              sheetType === 'category'
                ? 'Category'
                : 'Brand name'
            }
            // snapPoints={['25%']}
            enableDynamicSizing={true}
            onClose={() => {
              setTimeout(() => {
                setIsSheetOpen(false)
              }, 50);
            }}
            contentType='flat'
            contentProps={{
              flatListProps: {
                data: categoryData,
                renderItem: renderCategoryItem,
                keyExtractor: (item: CategoryItem, index: number) => item.value,
              },
            }}
          />
        </ThemedView>
      )}
    </Formik>
  );
}

export default React.memo(AddScreen);

// Styles
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
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  categoryItemText: {
    fontSize: 16,
  }
});