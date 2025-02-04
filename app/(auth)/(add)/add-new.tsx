import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Keyboard, FlatList, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Formik, FormikHelpers } from 'formik';
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

// Memoized helper functions (optimized for clarity)
const getItemsByType = (type: DataType, locale: string): BrandItem[] => {
  const items = returnItemsByType(type);
  return items.map((item) => ({
    code: item.code,
    name: item.name,
    full_name: item.full_name[locale],
    type: type === 'vietqr' ? 'store' : type,
  }));
};

const getItemData = (itemCode: string, locale: string): BrandItem | null => {
  const itemData = returnItemData(itemCode);
  return itemData
    ? {
      code: itemCode,
      name: itemData.name,
      full_name: itemData.full_name[locale],
      type: 'store',
    }
    : null;
};

// ** Main Component **
const AddScreen: React.FC = () => {
  const { currentTheme: theme } = useTheme();
  const { locale: currentLocale } = useLocale();
  const locale = currentLocale ?? 'en';

  // Theme-related values
  const colors = theme === 'light' ? Colors.light.text : Colors.dark.text;
  const iconColors = theme === 'light' ? Colors.light.icon : Colors.dark.icon;
  const sectionsColors = theme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground;

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
    metadataType: metadataTypeData[0],
  });
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetType, setSheetType] = useState<SheetType | null>(null);

  // Refs and animated values
  const bottomSheetRef = useRef<BottomSheet>(null);
  const scrollY = useSharedValue(0);

  // Memoized values (optimized for clarity)
  const { bankCode, itemCode } = useMemo(() => {
    const isEWallet = codeType === 'ewallet';
    return {
      bankCode: (!isEWallet && codeBin) ? returnItemCodeByBin(codeBin.toString()) : null,
      itemCode: isEWallet ? codeProvider : codeProvider || returnItemCodeByBin(codeBin?.toString() || ''),
    };
  }, [codeBin, codeType, codeProvider]);

  const categoryMap = useMemo(() => ({
    bank: { display: t('addScreen.bankCategory'), value: 'bank' },
    ewallet: { display: t('addScreen.ewalletCategory'), value: 'ewallet' },
    store: { display: t('addScreen.storeCategory'), value: 'store' },
  }), [locale]);

  // Initial params setup (optimized)
  const initialParams: Partial<FormParams> = useMemo(() => {
    const category = codeType && categoryMap[codeType as keyof typeof categoryMap] ?
      categoryMap[codeType as keyof typeof categoryMap] as CategoryItem :
      null;

    const brand = itemCode ? getItemData(itemCode, locale) : null;

    return {
      metadataType: metadataTypeData[0],
      category,
      brand: brand && brand.type === category?.value ? brand : null,
    };
  }, [codeType, itemCode, locale, categoryMap]);

  // Effects
  useEffect(() => {
    setParams((prev) => ({
      ...prev,
      ...initialParams,
    }));
  }, [initialParams]);

  const brands = useMemo(() => {
    return params.category ? getItemsByType(params.category.value, locale) : [];
  }, [params.category, locale]);

  // Animation handlers (optimized)
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const scrollThreshold = getResponsiveHeight(7);
  const animationRange = getResponsiveHeight(5);
  const translateYValue = -getResponsiveHeight(3);
  const scaleValue = 0.6;

  const titleContainerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [scrollThreshold, scrollThreshold + animationRange],
      [1, 0],
      Extrapolation.CLAMP
    ),
    transform: [{
      translateY: interpolate(
        scrollY.value,
        [0, scrollThreshold],
        [0, translateYValue],
        Extrapolation.CLAMP
      ),
    }],
    zIndex: scrollY.value > scrollThreshold * 0.75 || isSheetOpen ? 0 : 1,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{
      scale: interpolate(
        scrollY.value,
        [0, scrollThreshold],
        [0.8, scaleValue],
        Extrapolation.CLAMP
      ),
    }],
  }));

  // Event handlers (optimized)
  const updateParams = useCallback((updates: Partial<FormParams>) => {
    setParams((prev) => ({
      ...prev,
      ...updates,
      ...(updates.category ? { brand: null } : {}), // Clear brand if category changes
    }));
  }, []);

  const handleClearCategory = useCallback(() => updateParams({ category: null }), [updateParams]);
  const handleClearBrand = useCallback(() => updateParams({ brand: null }), [updateParams]);
  const handleClearMetadataType = useCallback(() => updateParams({ metadataType: metadataTypeData[0] }), [updateParams]);

  const onNavigateBack = useCallback(() => router.back(), []);

  const onOpenSheet = useCallback((type: SheetType) => {
    if (type === 'brand' && !params.category) {
      Alert.alert(t("addScreen.categoryNotSelected"));
      return;
    }
    setIsSheetOpen(true);
    setSheetType(type);
    bottomSheetRef.current?.snapToIndex(0);
    Keyboard.dismiss();
  }, [params.category]);

  // Render functions (optimized)
  const renderCardItem = useCallback(
    (metadata: string, accountName: string, accountNumber: string) => (
      <ThemedCardItem
        accountName={accountName}
        accountNumber={accountNumber}
        code={params.brand?.code || bankCode?.toString() || ''}
        type={params.category?.value || 'store'}
        metadata={metadata || ''}
        metadata_type={params.metadataType?.value || 'qr'}
        animatedStyle={cardStyle}
      />
    ),
    [params, cardStyle, bankCode]
  );

  const handleSheetItemSelect = useCallback((item: CategoryItem | BrandItem | MetadataTypeItem, type: SheetType) => {
    const updates: Partial<FormParams> = {};
    switch (type) {
      case 'category':
        updates.category = item as CategoryItem;
        updates.brand = null;
        break;
      case 'brand':
        updates.brand = item as BrandItem;
        break;
      case 'metadataType':
        updates.metadataType = item as MetadataTypeItem;
        break;
    }
    updateParams(updates);
    bottomSheetRef.current?.close();
    setSheetType(null);
  }, [updateParams]);

  // Memoized Sheet Item Components
  const CategorySheetItemMemo = useMemo(() => CategorySheetItem, []);
  const BrandSheetItemMemo = useMemo(() => BrandSheetItem, []);
  const MetadataTypeSheetItemMemo = useMemo(() => MetadataTypeSheetItem, []);

  const renderSheetItem = useCallback((item: CategoryItem | BrandItem | MetadataTypeItem) => {
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
        <CategorySheetItemMemo
          {...commonProps}
          onPress={() => handleSheetItemSelect(item, 'category')}
        />
      );
    } else if (isBrand) {
      return (
        <BrandSheetItemMemo
          {...commonProps}
          onPress={() => handleSheetItemSelect(item, 'brand')}
        />
      );
    } else if (isMetadataType) {
      return (
        <MetadataTypeSheetItemMemo
          {...commonProps}
          onPress={() => handleSheetItemSelect(item, 'metadataType')}
        />
      );
    }
    return null;
  }, [params, iconColors, colors, handleSheetItemSelect]);

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

  // Form Submission Handler
  const onSubmit = useCallback(async (values: any, formikHelpers: FormikHelpers<any>) => {
    try {
      // Your submission logic here (e.g., API call)
      router.replace('/(auth)/home');
    } catch (error) {
      console.error("Submission error:", error);
      // Handle error (e.g., display error message)
    } finally {
      formikHelpers.setSubmitting(false);
    }
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
      onSubmit={onSubmit}
      enableReinitialize={false}
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
            {renderCardItem(values.metadata, values.account_name, values.account_number)}

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
                disabled={!!codeValue || !params.category || !params.brand} 
                disableOpacityChange={true}
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

            {(params.category?.value !== 'store' && typeof params.category?.value === 'string' && params.category.value.length > 0) && (
              <ThemedView style={[styles.formContainer, { backgroundColor: sectionsColors }]}>
                <ThemedInput
                  iconName="account"
                  placeholder={t('addScreen.accountNamePlaceholder')}
                  value={values.account_name}
                  onChangeText={handleChange('account_name')}
                  onBlur={handleBlur('account_name')}
                  backgroundColor={sectionsColors}
                />
                <ThemedInput
                  iconName="account-cash"
                  placeholder={t('addScreen.accountNumberPlaceholder')}
                  value={values.account_number}
                  onChangeText={handleChange('account_number')}
                  onBlur={handleBlur('account_number')}
                  backgroundColor={sectionsColors}
                  keyboardType='numeric'
                />
              </ThemedView>
            )}

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
                ? t('addScreen.categoryTitle')
                : sheetType === 'brand'
                  ? t('addScreen.brandTitle')
                  : sheetType === 'metadataType'
                    ? t('addScreen.metadataTypeTitle')
                    : ''
            }
            snapPoints={
              sheetType === 'category'
                ? ['32%']
                : sheetType === 'metadataType'
                  ? ['25%']
                  : ['40%', '80%']
            }
            onClose={() => {
              // Use setTimeout to prevent animation glitches
              setTimeout(() => setIsSheetOpen(false), 50);
            }}
            contentType="flat"
            contentProps={{
              flatListProps: {
                data: sheetData,
                showsVerticalScrollIndicator: false,
                renderItem: ({ item }) => renderSheetItem(item as CategoryItem | BrandItem | MetadataTypeItem),
                keyExtractor: keyExtractor,
                style: {
                  // Apply styling to the FlatList container
                  backgroundColor: sectionsColors,
                  borderRadius: getResponsiveWidth(4),
                  marginHorizontal: getResponsiveWidth(3.6),
                  marginBottom: getResponsiveHeight(3.6)
                }
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
    paddingTop: getResponsiveHeight(18),
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
    marginTop: getResponsiveHeight(1.2),
    marginBottom: getResponsiveHeight(2.4),
  },
  saveButton: {
    marginTop: getResponsiveHeight(2.4),
  },
});

export default React.memo(AddScreen);
