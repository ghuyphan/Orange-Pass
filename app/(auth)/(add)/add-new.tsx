import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Keyboard, FlatList } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Formik } from 'formik';
import { router } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import BottomSheet from '@gorhom/bottom-sheet';

// Local imports
import { RootState } from '@/store/rootReducer';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';

import { t } from '@/i18n';
// Components
import { ThemedButton } from '@/components/buttons/ThemedButton';
import ThemedCardItem from '@/components/cards/ThemedCardItem';
import { ThemedInput, ThemedDisplayInput } from '@/components/Inputs';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import ThemedReuseableSheet from '@/components/bottomsheet/ThemedReusableSheet';
import { CategorySheetItem, BrandSheetItem, MetadataTypeSheetItem } from '@/components/bottomsheet/SheetItem';

// Utilities
import { qrCodeSchema } from '@/utils/validationSchemas';
import {
  returnItemCodeByBin,
  returnItemData,
  returnItemsByType,
} from '@/utils/returnItemData';
import { useLocale } from '@/context/LocaleContext';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';

const AnimatedKeyboardAwareScrollView = Animated.createAnimatedComponent(KeyboardAwareScrollView);

type SheetType = 'category' | 'brand' | 'metadataType';

interface CategoryItem {
  display: string;
  value: 'store' | 'bank' | 'ewallet';
}

interface BrandItem {
  code: string;
  name: string;
  full_name: string;
  type: 'store' | 'bank' | 'ewallet';
}

interface MetadataTypeItem {
  display: string;
  value: 'qr' | 'barcode';
}

const metadataTypeData: MetadataTypeItem[] = [
  { display: 'QR Code', value: 'qr' },
  { display: 'Barcode', value: 'barcode' },
];

// Memoized helper functions (outside the component)
const memoizedReturnItemsByType = (type: string, locale: string) => {
  console.log("Calculating items for type:", type); // Log when calculation happens
  const items = returnItemsByType(type);
  return items.map((item) => ({
    code: item.code,
    name: item.name,
    full_name: item.full_name[locale],
    type: type,
  }));
};

const memoizedReturnItemData = (itemCode: string, locale: string) => {
  console.log("Fetching data for itemCode:", itemCode); // Log when fetching happens
  const itemData = returnItemData(itemCode);
  if (itemData) {
    return {
      code: itemCode,
      name: itemData.name,
      full_name: itemData.full_name[locale],
      type: 'store', // Default type
    };
  }
  return null;
};

const AddScreen: React.FC = () => {
  const { currentTheme: theme } = useTheme();

  const { locale: currentLocale } = useLocale();
  const locale = currentLocale ?? 'en';
  const colors = useMemo(
    () => (theme === 'light' ? Colors.light.text : Colors.dark.text),
    [theme]
  );
  const iconColors = useMemo(
    () => (theme === 'light' ? Colors.light.icon : Colors.dark.icon),
    [theme]
  );
  const sectionsColors = useMemo(
    () => (theme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground),
    [theme]
  );

  const [category, setCategory] = useState<CategoryItem | null>(null);
  const [brand, setBrand] = useState<BrandItem | null>(null);
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetType, setSheetType] = useState<SheetType | null>(null); // use null as initial value
  const [metadataType, setMetadataType] = useState<MetadataTypeItem>(metadataTypeData[0]); // Default to 'qr'

  const bottomSheetRef = useRef<BottomSheet>(null);
  const scrollY = useSharedValue(0);

  const { codeFormat, codeValue, codeBin, codeType, codeProvider } = useLocalSearchParams<{
    codeFormat?: string;
    codeValue?: string;
    codeBin?: string;
    codeType?: string;
    codeProvider?: string;
  }>();

  const { bankCode, itemCode } = useMemo(() => {
    let bankCodeResult: string | null = null;
    let itemCodeResult: string | null = null;

    if (codeType !== 'ewallet' && codeBin) {
      bankCodeResult = returnItemCodeByBin(codeBin.toString());
    }

    if (codeType === 'ewallet' && codeProvider) {
      itemCodeResult = codeProvider;
    } else {
      itemCodeResult = bankCodeResult;
    }

    return { bankCode: bankCodeResult, itemCode: itemCodeResult };
  }, [codeBin, codeType, codeProvider]);

  // Optimized State Initialization and Updates
  useEffect(() => {
    const categoryMap = {
      store: { display: t('addScreen.storeCategory'), value: 'store' },
      bank: { display: t('addScreen.bankCategory'), value: 'bank' },
      ewallet: { display: t('addScreen.ewalletCategory'), value: 'ewallet' },
    };

    // 1. Initialize category based on codeType (only if codeType is valid)
    let initialCategory = null;
    if (
      codeType &&
      (codeType === 'store' || codeType === 'bank' || codeType === 'ewallet')
    ) {
      initialCategory = categoryMap[codeType];
      setCategory(initialCategory);
    }

    // 2. Initialize brand based on itemCode (only if itemCode is valid and category is set or default type)
    if (itemCode) {
      const itemData = memoizedReturnItemData(itemCode, locale);
      if (itemData) {
        setBrand({
          ...itemData,
          type: initialCategory ? initialCategory.value : 'store', // Use category type if available, otherwise default
        });
      }
    }

    // 3. Initialize brands based on initialCategory (only if category is set)
    if (initialCategory) {
      const initialBrands = memoizedReturnItemsByType(initialCategory.value, locale);
      setBrands(initialBrands);
    }
  }, [codeType, itemCode, locale]); // Run only when codeType, itemCode, or locale changes

  // Update brands when category changes
  useEffect(() => {
    if (category) {
      const updatedBrands = memoizedReturnItemsByType(category.value, locale);
      setBrands(updatedBrands);
    } else {
      setBrands([]); // Clear brands if category is null
    }
  }, [category, locale]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const scrollThreshold = getResponsiveHeight(7);
  const animationRange = getResponsiveHeight(5);
  const translateYValue = -getResponsiveHeight(3);
  const scaleValue = 0.6;

  const titleContainerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [scrollThreshold, scrollThreshold + animationRange],
      [1, 0],
      Extrapolation.CLAMP
    );

    const translateY = interpolate(
      scrollY.value,
      [0, scrollThreshold],
      [0, translateYValue],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ translateY }],
      zIndex: scrollY.value > scrollThreshold * 0.75 || isSheetOpen ? 0 : 1,
    };
  });

  const cardStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [0, scrollThreshold],
      [0.8, scaleValue],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale }],
    };
  });

  const onNavigateBack = useCallback(() => {
    router.back();
  }, []);

  const onOpenSheet = useCallback(
    (type: SheetType) => {
      if (type === 'brand' && !category) {
        console.warn("Category is not selected. Cannot open brand sheet.");
        return;
      }
      setIsSheetOpen(true);
      setSheetType(type);
      bottomSheetRef.current?.snapToIndex(0); // Assuming 0 is the desired snap point index
      if (Keyboard.isVisible()) {
        Keyboard.dismiss();
      }
    },
    [category]
  );

  const handleClearCategory = useCallback(() => {
    setCategory(null);
    setBrand(null); // Clear brand when category is cleared
  }, []);

  const handleClearBrand = useCallback(() => {
    setBrand(null);
  }, []);

  const handleClearMetadataType = useCallback(() => {
    setMetadataType(metadataTypeData[0]);
  }, []);
  const renderCardItem = useCallback((metadata: string) => {
    // Derive data from local state instead of relying solely on itemCode from route params
    const cardItemCode = brand?.code || (category && returnItemCodeByBin(category.value)) || '';

    return (
      <ThemedCardItem
        code={cardItemCode}
        type={category?.value || 'store'}
        metadata={metadata || ''}
        metadata_type={metadataType?.value || 'qr'}
        animatedStyle={cardStyle}
      />
    );
  }, [brand, category, metadataType, cardStyle]);

  const renderSheetItem = useCallback(
    (item: CategoryItem | BrandItem | MetadataTypeItem) => {
      const isCategory = 'value' in item && (item.value === 'store' || item.value === 'bank' || item.value === 'ewallet');
      const isMetadataType = 'value' in item && (item.value === 'qr' || item.value === 'barcode');
      const isBrand = 'code' in item;

      const isSelected = isCategory
        ? category?.value === item.value
        : isBrand
          ? brand?.code === item.code
          : isMetadataType
            ? metadataType?.value === item.value
            : false;

      if (!item) return null;

      if (isCategory) {
        return (
          <CategorySheetItem
            item={item}
            isSelected={isSelected}
            onPress={() => {
              setCategory(item as CategoryItem);
              setBrand(null);
              bottomSheetRef.current?.close();
              setSheetType(null);
            }}
            iconColors={iconColors}
            textColors={colors}
          />
        );
      } else if (isBrand) {
        return (
          <BrandSheetItem
            item={item}
            isSelected={isSelected}
            onPress={() => {
              setBrand(item as BrandItem);
              bottomSheetRef.current?.close();
              setSheetType(null);
            }}
            iconColors={iconColors}
            textColors={colors}
          />
        );
      } else if (isMetadataType) {
        return (
          <MetadataTypeSheetItem
            item={item}
            isSelected={isSelected}
            onPress={() => {
              setMetadataType(item as MetadataTypeItem);
              bottomSheetRef.current?.close();
              setSheetType(null);
            }}
            iconColors={iconColors}
            textColors={colors}
          />
        );
      }
      return null;
    },
    [category, brand, metadataType, iconColors, colors]
  );

  const categoryData: CategoryItem[] = useMemo(() => [
    { display: t('addScreen.storeCategory'), value: 'store' },
    { display: t('addScreen.bankCategory'), value: 'bank' },
    { display: t('addScreen.ewalletCategory'), value: 'ewallet' },
  ], []);

  // Prepare sheet data
  const sheetData = useMemo(() => {
    switch (sheetType) {
      case 'category':
        return categoryData;
      case 'brand':
        return brands;
      case 'metadataType':
        return metadataTypeData;
      default:
        return [];
    }
  }, [sheetType, categoryData, brands]);

  // Key extractor
  const keyExtractor = useCallback((item: unknown, index: number) => {
    const typedItem = item as CategoryItem | BrandItem | MetadataTypeItem;
    if ('value' in typedItem) {
      return typedItem.value;
    } else if ('code' in typedItem) {
      return typedItem.code;
    } else {
      return index.toString();
    }
  }, []);

  return (
    <Formik
      initialValues={{
        code: brand?.code || bankCode?.toString() || '',
        qr_index: '',
        metadata: codeValue?.toString() || '',
        category: category?.value || '',
        metadata_type: 'qr', // Add metadata_type to initial values
        account_name: '',
        account_number: '',
      }}
      validationSchema={qrCodeSchema}
      onSubmit={async (values, { setSubmitting }) => {
        setSubmitting(true);
        try {
          console.log('Selected metadata type:', values.metadata_type); // Use this value
          router.replace('/(auth)/home');
        } catch (error) {
          console.error(error);
        } finally {
          setSubmitting(false);
        }
      }}
      enableReinitialize
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
              <ThemedText style={styles.title} type="title">
                {t('addScreen.title')}
              </ThemedText>
            </View>
          </Animated.View>

          <AnimatedKeyboardAwareScrollView
            contentContainerStyle={styles.scrollViewContent}
            enableOnAndroid={true}
            extraScrollHeight={getResponsiveHeight(6)}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScroll={scrollHandler}
            scrollEnabled={true}
          >
            {renderCardItem(values.metadata)}

            <ThemedView style={[styles.formContainer, { backgroundColor: sectionsColors }]}>
              <ThemedDisplayInput
                iconName="format-list-bulleted-type"
                placeholder={t('addScreen.categoryPlaceholder')}
                value={category?.display}
                onPress={() => onOpenSheet('category')}
                onClear={handleClearCategory}
              />
              <ThemedDisplayInput
                iconName="domain"
                placeholder={t('addScreen.brandPlaceholder')}
                logoCode={brand ? brand.code : undefined} // Clear logoCode when brand is null
                value={brand?.name || ''}
                onPress={() => onOpenSheet('brand')}
                onClear={handleClearBrand}
                disabled={!category}
              />
              <ThemedInput
                iconName="credit-card-outline"
                placeholder={t('addScreen.metadataPlaceholder')}
                value={values.metadata}
                onChangeText={handleChange('metadata')}
                onBlur={handleBlur('metadata')}
                backgroundColor={sectionsColors}
                disabled={!!codeValue}
              />
              <ThemedDisplayInput
                iconName="qrcode" // Or a more generic icon
                placeholder={t('addScreen.metadataTypePlaceholder')}
                value={metadataType?.display}
                onPress={() => onOpenSheet('metadataType')}
                onClear={handleClearMetadataType}
                showClearButton={false}
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
            title={
              sheetType === 'category'
                ? t('addScreen.categoryTitle')
                : sheetType === 'brand'
                  ? t('addScreen.brandTitle')
                  : sheetType === 'metadataType'
                    ? t('addScreen.metadataTypeTitle')
                    : ''
            }
            snapPoints={['70%']} // Set a fixed height
            enableDynamicSizing={false} // Disable dynamic sizing
            onClose={() => setIsSheetOpen(false)}
            contentType="flat"
            contentProps={{
              flatListProps: {
                data: sheetData,
                showsVerticalScrollIndicator: false,
                renderItem: ({ item }) => renderSheetItem(item as CategoryItem | BrandItem | MetadataTypeItem),
                keyExtractor: keyExtractor,
              },
            }}
          />
        </ThemedView>
      )}
    </Formik>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingHorizontal: getResponsiveWidth(4.8),
    paddingTop: getResponsiveHeight(15.6),
  },
  titleContainer: {
    position: 'absolute',
    top: getResponsiveHeight(10),
    left: 0,
    right: 0,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: getResponsiveWidth(4.8),
    gap: getResponsiveWidth(4.8),
  },
  titleButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveWidth(4.8),
  },
  title: {
    fontSize: getResponsiveFontSize(28),
  },
  titleButton: {},
  formContainer: {
    justifyContent: 'center',
    borderRadius: getResponsiveWidth(4),
    // padding: getResponsiveWidth(1.2),
  },
  saveButton: {
    marginTop: getResponsiveHeight(2.4),
  },
});

export default React.memo(AddScreen);