import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Keyboard, FlatList, Alert } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Formik, FormikHelpers } from 'formik';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import BottomSheet from '@gorhom/bottom-sheet';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { t } from '@/i18n';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import ThemedCardItem from '@/components/cards/ThemedCardItem';
import { ThemedInput, ThemedDisplayInput } from '@/components/Inputs';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import ThemedReuseableSheet from '@/components/bottomsheet/ThemedReusableSheet';
import { CategorySheetItem, BrandSheetItem, MetadataTypeSheetItem } from '@/components/bottomsheet/SheetItem';
import { qrCodeSchema } from '@/utils/validationSchemas';
import { returnItemCodeByBin, returnItemData, returnItemsByType } from '@/utils/returnItemData';
import { useLocale } from '@/context/LocaleContext';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';
import DataType from '@/types/dataType';

const AnimatedKeyboardAwareScrollView = Animated.createAnimatedComponent(KeyboardAwareScrollView);

// --- Type Definitions ---
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

// Union type for sheet items
type SheetItem = CategoryItem | BrandItem | MetadataTypeItem;

interface FormParams {
  category: CategoryItem | null;
  brand: BrandItem | null;
  metadataType: MetadataTypeItem;
  metadata: string;
  accountName: string;
  accountNumber: string;
}

type SheetType = 'category' | 'brand' | 'metadataType';

const metadataTypeData: MetadataTypeItem[] = [
  { display: t('addScreen.qr'), value: 'qr' },
  { display: t('addScreen.barcode'), value: 'barcode' },
];

// --- Helper Functions ---
const getItemsByTypeHelper = (type: DataType, locale: string): BrandItem[] =>
  returnItemsByType(type).map((item) => ({
    code: item.code,
    name: item.name,
    full_name: item.full_name[locale],
    type: type === 'vietqr' ? 'store' : type,
  }));

const getItemDataHelper = (itemCode: string, locale: string): BrandItem | null => {
  const itemData = returnItemData(itemCode);
  return itemData
    ? {
      code: itemCode,
      name: itemData.name,
      full_name: itemData.full_name[locale],
      type: 'store', // Always 'store'
    }
    : null;
};

// --- Main Component ---
const AddScreen: React.FC = () => {
  const { currentTheme } = useTheme();
  const { locale: currentLocale } = useLocale();
  const locale = currentLocale ?? 'en';

  const { text: colors, icon: iconColors, cardBackground: sectionsColors } = Colors[currentTheme];

  const { codeFormat, codeValue, codeBin, codeType, codeProvider } = useLocalSearchParams<{
    codeFormat?: string;
    codeValue?: string;
    codeBin?: string;
    codeType?: string;
    codeProvider?: string;
  }>();

    // State for form parameters
  const [params, setParams] = useState<FormParams>({
    category: null,
    brand: null,
    metadataType: metadataTypeData[0],
    accountName: '',
    accountNumber: '',
    metadata: '',
  });
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetType, setSheetType] = useState<SheetType | null>(null);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const scrollY = useSharedValue(0);

   // Memoized bankCode and itemCode
  const { bankCode, itemCode } = useMemo(() => {
    const isEWallet = codeType === 'ewallet';
    return {
      bankCode: !isEWallet && codeBin ? returnItemCodeByBin(codeBin) : null,
      itemCode: codeProvider || returnItemCodeByBin(codeBin || ''),
    };
  }, [codeBin, codeType, codeProvider]);

  const categoryMap = useMemo(() => ({
    bank: { display: t('addScreen.bankCategory'), value: 'bank' },
    ewallet: { display: t('addScreen.ewalletCategory'), value: 'ewallet' },
    store: { display: t('addScreen.storeCategory'), value: 'store' },
  }), [locale]);

    // Memoized initial parameters
const initialParams: Partial<FormParams> = useMemo(() => {
  const categoryKey = codeType as keyof typeof categoryMap;
  const category = categoryKey && categoryMap[categoryKey] ? categoryMap[categoryKey] as CategoryItem : null;
  const brand = itemCode ? getItemDataHelper(itemCode, locale) : null;
  console.log('brand:', brand);

  return {
    metadataType: metadataTypeData[0],
    category,
    brand: brand && brand.type === category?.value ? brand : null,
  };
}, [codeType, itemCode, locale, categoryMap]);

    // Initialize params with initialParams
  useEffect(() => {
    setParams((prev) => ({ ...prev, ...initialParams }));
  }, [initialParams]);

  const updateParams = useCallback((updates: Partial<FormParams>) => {
    setParams((prev) => ({
      ...prev,
      ...updates,
      ...(updates.category ? { brand: null } : {}), // Clear brand if category changes
    }));
  }, []);

  // useEffect to automatically set the brand based on bankCode
    useEffect(() => {
        if (bankCode && !params.brand) { // Only set if bankCode exists and no brand is manually selected
            const brandFromBankCode = getItemDataHelper(bankCode.toString(), locale);
            if (brandFromBankCode) {
                updateParams({ brand: brandFromBankCode });
            }
        }
    }, [bankCode, params.brand, locale, updateParams]);


  const brands = useMemo(() => {
    return params.category ? getItemsByTypeHelper(params.category.value, locale) : [];
  }, [params.category, locale]);

  // --- Animation ---
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
    opacity: interpolate(scrollY.value, [scrollThreshold, scrollThreshold + animationRange], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [0, scrollThreshold], [0, translateYValue], Extrapolation.CLAMP) }],
    zIndex: scrollY.value > scrollThreshold * 0.75 || isSheetOpen ? 0 : 1,
  }), [isSheetOpen]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(scrollY.value, [0, scrollThreshold], [0.8, scaleValue], Extrapolation.CLAMP) }],
  }));

 // --- Event Handlers ---


  const handleClearCategory = useCallback(() => {
    updateParams({ category: null, brand: null, accountName: '', accountNumber: '', metadata: '' });
  }, [updateParams]);

  const handleClearBrand = useCallback(() => updateParams({ brand: null }), [updateParams]);
  const handleClearMetadataType = useCallback(() => updateParams({ metadataType: metadataTypeData[0] }), [updateParams]);

  const onNavigateBack = useCallback(() => router.back(), []);

  const onOpenSheet = useCallback((type: SheetType) => {
    if (type === 'brand' && !params.category) {
      Alert.alert(t('addScreen.categoryNotSelected'));
      return;
    }
    setIsSheetOpen(true);
    setSheetType(type);
    bottomSheetRef.current?.snapToIndex(0);
    Keyboard.dismiss();
  }, [params.category]);

  const handleSheetItemSelect = useCallback((item: SheetItem, type: SheetType) => {
    const updates: Partial<FormParams> = {};
    switch (type) {
      case 'category':
        updates.category = item as CategoryItem;
        updates.brand = null; // Clear brand on category change
        updates.metadataType = metadataTypeData[0]; // Reset metadataType
        updates.accountName = '';
        updates.accountNumber = '';
        updates.metadata = '';
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

   // --- Rendering Functions ---
  const renderCardItem = useCallback((metadata: string, accountName: string, accountNumber: string) => (
    <ThemedCardItem
      accountName={accountName}
      accountNumber={accountNumber}
      code={codeProvider ? codeProvider : params.brand?.code || ''}
      type={params.category?.value || 'store'}
      metadata={metadata}
      metadata_type={params.metadataType?.value}
      animatedStyle={cardStyle}
    />
  ), [params, cardStyle, bankCode]);

    // --- Sheet Rendering ---
  const renderSheetItem = useCallback((item: SheetItem) => {
    if (!item) return null;

    const isCategory = 'value' in item && ['store', 'bank', 'ewallet'].includes(item.value);
    const isMetadataType = 'value' in item && ['qr', 'barcode'].includes(item.value);
    const isBrand = 'code' in item;

    const isSelected = isCategory
      ? params.category?.value === item.value
      : isBrand
        ? params.brand?.code === item.code
        : isMetadataType
          ? params.metadataType?.value === item.value
          : false;

    const commonProps = {
      item,
      isSelected,
      iconColors,
      textColors: colors, // Use consistent names
    };

    switch (true) {
      case isCategory:
        return <CategorySheetItem {...commonProps} onPress={() => handleSheetItemSelect(item, 'category')} />;
      case isBrand:
        return <BrandSheetItem {...commonProps} onPress={() => handleSheetItemSelect(item, 'brand')} />;
      case isMetadataType:
        return <MetadataTypeSheetItem {...commonProps} onPress={() => handleSheetItemSelect(item, 'metadataType')} />;
      default:
        return null;
    }
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

  const keyExtractor = useCallback((item: SheetItem | unknown) => {
    return 'value' in (item as SheetItem)
      ? (item as CategoryItem | MetadataTypeItem).value
      : 'code' in (item as SheetItem)
      ? (item as BrandItem).code
      : String(item);
  }, []);

  // --- Form Submission ---

    const handleFormSubmit = useCallback(async (values: FormParams, formikHelpers: FormikHelpers<FormParams>) => {
    try {
      // Submission logic
        console.log("Submitting values:", values); // Log the values being submitted
      router.replace('/(auth)/home');
    } catch (error) {
      console.error('Submission error:', error);
      Alert.alert(
        t('addScreen.submissionErrorTitle'),
        t('addScreen.submissionErrorMessage'),
        [{ text: t('addScreen.ok') }]
      );
    } finally {
      formikHelpers.setSubmitting(false);
    }
  }, [router]);

  return (
    <Formik<FormParams>
      initialValues={{
        category: initialParams.category || null,
        brand: initialParams.brand || null,
        metadataType: initialParams.metadataType || metadataTypeData[0],
        metadata: codeValue || '',
        accountName: '',
        accountNumber: '',
      }}
      validationSchema={qrCodeSchema}
      onSubmit={handleFormSubmit}  //Use the handler function
      enableReinitialize={true}
    >
      {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isSubmitting, setFieldValue }) => (
        <ThemedView style={styles.container}>
          <Animated.View style={[styles.titleContainer, titleContainerStyle]}>
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
            contentContainerStyle={styles.scrollViewContent}
            enableOnAndroid={true}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScroll={scrollHandler}
            scrollEnabled={true}
          >
            {renderCardItem(values.metadata, values.accountName, values.accountNumber)}

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
                logoCode={codeProvider ? codeProvider : params.brand?.code}
                value={codeProvider ? codeProvider : params.brand?.code}
                onPress={() => onOpenSheet('brand')}
                onClear={handleClearBrand}
                disabled={!params.category}
              />
              <ThemedInput
                iconName="credit-card-outline"
                placeholder={t('addScreen.metadataPlaceholder')}
                value={values.metadata}
                onChangeText={(text) => setFieldValue('metadata', text)}
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
                  value={values.accountName}
                  onChangeText={(text) => setFieldValue('accountName', text)}
                  onBlur={handleBlur('accountName')}
                  backgroundColor={sectionsColors}
                  disabled={!values.metadata}
                  disableOpacityChange={true}
                />
                <ThemedInput
                  iconName="account-cash"
                  placeholder={t('addScreen.accountNumberPlaceholder')}
                  value={values.accountNumber}
                  onChangeText={(text) => setFieldValue('accountNumber', text)}
                  onBlur={handleBlur('accountNumber')}
                  backgroundColor={sectionsColors}
                  keyboardType='numeric'
                  disabled={!values.metadata}
                  disableOpacityChange={true}
                />
              </ThemedView>
            )}

            <ThemedButton
              label={t('addScreen.saveButton')}
              onPress={handleSubmit} // Formik's handleSubmit
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
            snapPoints={
              sheetType === 'category'
                ? ['32%']
                : sheetType === 'metadataType'
                  ? ['25%']
                  : ['40%', '80%']
            }
            onClose={() => {
              setTimeout(() => setIsSheetOpen(false), 50);
            }}
            contentType="flat"
            contentProps={{
              flatListProps: {
                data: sheetData,
                showsVerticalScrollIndicator: false,
                renderItem: ({ item }) => renderSheetItem(item as SheetItem),
                keyExtractor: keyExtractor,
                style: { ...styles.flatListStyle, backgroundColor: sectionsColors },
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
  flatListStyle: {
    borderRadius: getResponsiveWidth(4),
    marginHorizontal: getResponsiveWidth(3.6),
    marginBottom: getResponsiveHeight(3.6),
  },
});

export default React.memo(AddScreen);