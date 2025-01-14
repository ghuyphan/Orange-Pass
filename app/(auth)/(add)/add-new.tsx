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

// Utilities and Types
import { qrCodeSchema } from '@/utils/validationSchemas';
import {
  returnItemCodeByBin,
  returnItemData,
  returnItemsByType,
} from '@/utils/returnItemData';
import { useLocale } from '@/context/LocaleContext';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';
import DataType from '@/types/dataType';

const AnimatedKeyboardAwareScrollView = Animated.createAnimatedComponent(KeyboardAwareScrollView);

// Types
interface CategoryItem {
  display: string;
  value: 'bank' | 'ewallet' | 'store';
}

interface BrandItem {
  code: string;
  name: string;
  full_name: string;
  // type: 'store' | 'bank' | 'ewallet';
  type: 'bank' | 'ewallet' | 'store';
}

interface MetadataTypeItem {
  display: string;
  value: 'qr' | 'barcode';
}

interface FormParams {
  category: CategoryItem | null;
  brand: BrandItem | null;
  metadataType: MetadataTypeItem;
}

type SheetType = 'category' | 'brand' | 'metadataType';

// Constants
const metadataTypeData: MetadataTypeItem[] = [
  { display: t('addScreen.qr'), value: 'qr' },
  { display: t('addScreen.barcode'), value: 'barcode' },
];

// Memoized helper functions
const memoizedReturnItemsByType = (type: DataType, locale: string) => {
  const items = returnItemsByType(type);
  return items.map((item) => ({
    code: item.code,
    name: item.name,
    full_name: item.full_name[locale],
    type: type === 'vietqr' ? 'store' : type,
  }));
};

const memoizedReturnItemData = (itemCode: string, locale: string) => {
  const itemData = returnItemData(itemCode);
  if (itemData) {
    return {
      code: itemCode,
      name: itemData.name,
      full_name: itemData.full_name[locale],
      type: 'store',
    };
  }
  return null;
};

const AddScreen: React.FC = () => {
  const { currentTheme: theme } = useTheme();
  const { locale: currentLocale } = useLocale();
  const locale = currentLocale ?? 'en';

  // Theme-related memoized values
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

  // Route params
  const { codeFormat, codeValue, codeBin, codeType, codeProvider } = useLocalSearchParams<{
    codeFormat?: string;
    codeValue?: string;
    codeBin?: string;
    codeType?: string;
    codeProvider?: string;
  }>();

  // State
  const [params, setParams] = useState<FormParams>({
    category: null,
    brand: null,
    metadataType: metadataTypeData[0]
  });
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetType, setSheetType] = useState<SheetType | null>(null);
  const [brands, setBrands] = useState<BrandItem[]>([]);

  // Refs and animated values
  const bottomSheetRef = useRef<BottomSheet>(null);
  const scrollY = useSharedValue(0);

  // Memoized values
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

  const categoryMap = useMemo(() => ({
    bank: { display: t('addScreen.bankCategory'), value: 'bank' },
    ewallet: { display: t('addScreen.ewalletCategory'), value: 'ewallet' },
    store: { display: t('addScreen.storeCategory'), value: 'store' },
    // bank: { display: t('addScreen.bankCategory'), value: 'bank' },

  }), [locale]);

  // Initial params setup
  const initialParams = useMemo(() => {
    const result: Partial<FormParams> = {
      metadataType: metadataTypeData[0]
    };

    if (codeType && (codeType === 'store' || codeType === 'bank' || codeType === 'ewallet')) {
      result.category = categoryMap[codeType] as CategoryItem;
    }

    if (itemCode) {
      const itemData = memoizedReturnItemData(itemCode, locale);
      if (itemData && result.category) {
        result.brand = {
          ...itemData,
          type: result.category.value
        };
      }
    }

    return result;
  }, [codeType, itemCode, locale, categoryMap]);

  // Effects
  useEffect(() => {
    setParams(prev => ({
      ...prev,
      ...initialParams
    }));
  }, [initialParams]);

  useEffect(() => {
    if (params.category) {
      const updatedBrands = memoizedReturnItemsByType(params.category.value, locale);
      setBrands(updatedBrands);
    } else {
      setBrands([]);
    }
  }, [params.category, locale]);

  // Animation handlers
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

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{
      scale: interpolate(
        scrollY.value,
        [0, scrollThreshold],
        [0.8, scaleValue],
        Extrapolation.CLAMP
      )
    }],
  }));

  // Event handlers
  const updateParams = useCallback((updates: Partial<FormParams>) => {
    setParams(prev => {
      const newParams = { ...prev, ...updates };

      // Handle dependent updates
      if (updates.category) {
        newParams.brand = null;
      }

      return newParams;
    });
  }, []);

  const handleClearCategory = useCallback(() => {
    updateParams({ category: null, brand: null });
  }, [updateParams]);

  const handleClearBrand = useCallback(() => {
    updateParams({ brand: null });
  }, [updateParams]);

  const handleClearMetadataType = useCallback(() => {
    updateParams({ metadataType: metadataTypeData[0] });
  }, [updateParams]);

  const onNavigateBack = useCallback(() => {
    router.back();
  }, []);

  const onOpenSheet = useCallback(
    (type: SheetType) => {
      if (type === 'brand' && !params.category) {
        console.warn("Category is not selected. Cannot open brand sheet.");
        return;
      }
      setIsSheetOpen(true);
      setSheetType(type);
      bottomSheetRef.current?.snapToIndex(0);
      if (Keyboard.isVisible()) {
        Keyboard.dismiss();
      }
    },
    [params.category]
  );

  // Render functions
  const renderCardItem = useCallback((metadata: string) => {
    const cardItemCode = params.brand?.code || (params.category && returnItemCodeByBin(params.category.value)) || '';

    return (
      <ThemedCardItem
        code={cardItemCode}
        type={params.category?.value || 'store'}
        metadata={metadata || ''}
        metadata_type={params.metadataType?.value || 'qr'}
        animatedStyle={cardStyle}
      />
    );
  }, [params, cardStyle]);

  const handleSheetItemSelect = useCallback((
    item: CategoryItem | BrandItem | MetadataTypeItem,
    type: SheetType
  ) => {
    switch (type) {
      case 'category':
        updateParams({
          category: item as CategoryItem,
          brand: null
        });
        break;
      case 'brand':
        updateParams({
          brand: item as BrandItem
        });
        break;
      case 'metadataType':
        updateParams({
          metadataType: item as MetadataTypeItem
        });
        break;
    }
    bottomSheetRef.current?.close();
    setSheetType(null);
  }, [updateParams]);

  const renderSheetItem = useCallback(
    (item: CategoryItem | BrandItem | MetadataTypeItem) => {
      const isCategory = 'value' in item && (item.value === 'store' || item.value === 'bank' || item.value === 'ewallet');
      const isMetadataType = 'value' in item && (item.value === 'qr' || item.value === 'barcode');
      const isBrand = 'code' in item;

      const isSelected = isCategory
        ? params.category?.value === item.value
        : isBrand
          ? params.brand?.code === item.code
          : isMetadataType
            ? params.metadataType?.value === item.value
            : false;

      if (!item) return null;

      const commonProps = {
        item,
        isSelected,
        iconColors,
        textColors: colors,
      };

      if (isCategory) {
        return (
          <CategorySheetItem
            {...commonProps}
            onPress={() => handleSheetItemSelect(item, 'category')}
          />
        );
      } else if (isBrand) {
        return (
          <BrandSheetItem
            {...commonProps}
            onPress={() => handleSheetItemSelect(item, 'brand')}
          />
        );
      } else if (isMetadataType) {
        return (
          <MetadataTypeSheetItem
            {...commonProps}
            onPress={() => handleSheetItemSelect(item, 'metadataType')}
          />
        );
      }
      return null;
    },
    [params, iconColors, colors, handleSheetItemSelect]
  );

  const categoryData: CategoryItem[] = useMemo(() => [
    { display: t('addScreen.bankCategory'), value: 'bank' },
    { display: t('addScreen.ewalletCategory'), value: 'ewallet' },
    { display: t('addScreen.storeCategory'), value: 'store' },

  ], [locale]);

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

  const keyExtractor = useCallback((item: unknown, index: number) => {
    const typedItem = item as CategoryItem | BrandItem | MetadataTypeItem;
    if ('value' in typedItem) {
      return typedItem.value;
    } else if ('code' in typedItem) {
      return typedItem.code;
    }
    return index.toString();
  }, []);

  return (
    <Formik
      initialValues={{
        code: params.brand?.code || bankCode?.toString() || '',
        qr_index: '',
        metadata: codeValue?.toString() || '',
        category: params.category?.value || '',
        metadata_type: params.metadataType.value,
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
                value={params.category?.display}
                onPress={() => onOpenSheet('category')}
                onClear={handleClearCategory}
              />
              <ThemedDisplayInput
                iconName="domain"
                placeholder={t('addScreen.brandPlaceholder')}
                logoCode={params.brand ? params.brand.code : undefined}
                value={params.brand?.name || ''}
                onPress={() => onOpenSheet('brand')}
                onClear={handleClearBrand}
                disabled={!params.category}
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
                iconName="qrcode"
                placeholder={t('addScreen.metadataTypePlaceholder')}
                value={params.metadataType?.display}
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
            styles={{
              flatListContent: {
                backgroundColor: sectionsColors,
                borderRadius: getResponsiveWidth(4),
                marginHorizontal: getResponsiveWidth(3.6),
                marginBottom: getResponsiveHeight(3.6),
              }
            }}
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
            snapPoints={
              sheetType === 'category'
                ? ['40%']
                : sheetType === 'metadataType'
                  ? ['40%'] // Assuming you want a specific snap point for metadataType
                  : ['40%', '80%']
            }
            onClose={() => {
              setTimeout(() => {
                setIsSheetOpen(false)
              }, 50);
            }}            contentType="flat"
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
  },
  saveButton: {
    marginTop: getResponsiveHeight(2.4),
  },
});

export default React.memo(AddScreen);