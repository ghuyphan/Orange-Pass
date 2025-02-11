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
  FadeIn,
  FadeOut,
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
import {
  CategorySheetItem,
  BrandSheetItem,
  MetadataTypeSheetItem,
} from '@/components/bottomsheet/SheetItem';
import { qrCodeSchema } from '@/utils/validationSchemas';
import {
  returnItemCodeByBin,
  returnItemData,
  returnItemsByType,
} from '@/utils/returnItemData';
import { useLocale } from '@/context/LocaleContext';
import {
  getResponsiveFontSize,
  getResponsiveWidth,
  getResponsiveHeight,
} from '@/utils/responsive';
import DataType from '@/types/dataType';
import { ThemedTopToast } from '@/components/toast/ThemedTopToast';

const AnimatedKeyboardAwareScrollView = Animated.createAnimatedComponent(
  KeyboardAwareScrollView
);

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

// --- Main Component ---
const AddScreen: React.FC = () => {
  const { currentTheme } = useTheme();
  const { locale: currentLocale } = useLocale();
  const locale = currentLocale ?? 'en';  // Default locale

  const { text: colors, icon: iconColors, cardBackground: sectionsColors } = Colors[currentTheme];

  // Get parameters from the URL (e.g., from QR code scan)
  const { codeFormat, codeValue, codeBin, codeType, codeProvider } = useLocalSearchParams<{
    codeFormat?: string;
    codeValue?: string;
    codeBin?: string;
    codeType?: string;
    codeProvider?: string;
  }>();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetType, setSheetType] = useState<SheetType | null>(null);
  const [isReady, setIsReady] = useState(false); // New state variable
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const bottomSheetRef = useRef<BottomSheet>(null);
  const scrollY = useSharedValue(0);

  const metadataTypeData: MetadataTypeItem[] = useMemo(
    () => [
      { display: t('addScreen.qr'), value: 'qr' },
      { display: t('addScreen.barcode'), value: 'barcode' },
    ],
    [t]
  );

  // --- Helper Functions ---
  // Get items (brands) based on the category type
  const getItemsByTypeHelper = useCallback(
    (type: DataType, locale: string): BrandItem[] =>
      returnItemsByType(type).map((item) => {
        // Ensure 'type' is one of the acceptable values for 'BrandItem'
        if (type === 'bank' || type === 'store' || type === 'ewallet') {
          return {
            code: item.code,
            name: item.name,
            full_name: item.full_name[locale],
            type: type, // 'type' is already one of 'bank' | 'store' | 'ewallet'
          };
        } else {
          return {
            code: item.code,
            name: item.name,
            full_name: item.full_name[locale],
            type: 'bank',
          };
        }
      }),
    []
  );

  // Get brand data based on an item code
  const getItemDataHelper = useCallback(
    (itemCode: string, locale: string): BrandItem | null => {
      const itemData = returnItemData(itemCode); // Assuming returnItemData's signature and return type are known
      console.log('itemData', itemData);

      // Type guard to check if itemData.type is assignable to BrandItem type
      const isExpectedType = (type: DataType): type is 'bank' | 'store' | 'ewallet' => {
        return ['bank', 'store', 'ewallet'].includes(type);
      };

      return itemData && isExpectedType(itemData.type)
        ? {
          code: itemCode,
          name: itemData.name,
          full_name: itemData.full_name[locale],
          type: itemData.type, // Now guaranteed to be one of 'bank' | 'store' | 'ewallet'
        }
        : null;
    },
    [] // Dependencies array for useCallback
  );

  // --- Memoized values ---

  // Determine bankCode and itemCode from URL parameters
  const { bankCode, itemCode } = useMemo(() => {
    const isEWallet = codeType === 'ewallet';
    return {
      bankCode: !isEWallet && codeBin ? returnItemCodeByBin(codeBin) : null,  // Get bank code from BIN
      itemCode: codeProvider || returnItemCodeByBin(codeBin || ''), // Get item code from provider or BIN
    };
  }, [codeBin, codeType, codeProvider]);

  // Category options (localized)
  const categoryMap = useMemo(
    () => ({
      bank: { display: t('addScreen.bankCategory'), value: 'bank' },
      ewallet: { display: t('addScreen.ewalletCategory'), value: 'ewallet' },
      store: { display: t('addScreen.storeCategory'), value: 'store' },
    }),
    [t]
  );
  // Initial Formik values.  This is where we set up the initial state of the form.
  const initialValues: FormParams = useMemo(() => {
    const categoryKey = codeType as keyof typeof categoryMap;
    const category = categoryKey && categoryMap[categoryKey] ? categoryMap[categoryKey] as CategoryItem : null;
    const brand = codeType && itemCode ? getItemDataHelper(itemCode, locale) : null;

    // CORRECTLY determine metadataType based on codeFormat
    let metadataType: MetadataTypeItem;
    switch (codeFormat) {
      case '256':
        metadataType = metadataTypeData.find(item => item.value === 'qr') || metadataTypeData[0];
        break;
      case '1':
        metadataType = metadataTypeData.find(item => item.value === 'barcode') || metadataTypeData[0];
        break;
      default:
        metadataType = metadataTypeData[0]; // Default to QR code
    }

    return {
      metadataType: metadataType,
      category: category,
      brand: brand,
      metadata: codeValue || '',
      accountName: '',
      accountNumber: '',
    };
  }, [codeType, itemCode, locale, categoryMap, codeValue, codeFormat, metadataTypeData, getItemDataHelper]);


  // Brands list (dynamically generated based on the selected category)
  const brands = useCallback((categoryValue: DataType | undefined) => {
    return categoryValue
      ? getItemsByTypeHelper(categoryValue, locale)
      : [];
  }, [locale, getItemsByTypeHelper]);

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

  const titleContainerStyle = useAnimatedStyle(
    () => ({
      opacity: interpolate(
        scrollY.value,
        [scrollThreshold, scrollThreshold + animationRange],
        [1, 0],
        Extrapolation.CLAMP
      ),
      transform: [
        {
          translateY: interpolate(
            scrollY.value,
            [0, scrollThreshold],
            [0, translateYValue],
            Extrapolation.CLAMP
          ),
        },
      ],
      zIndex: scrollY.value > scrollThreshold * 0.75 || isSheetOpen ? 0 : 1,
    }),
    [isSheetOpen]
  );

  const cardStyle = useAnimatedStyle(
    () => ({
      transform: [
        {
          scale: interpolate(
            scrollY.value,
            [0, scrollThreshold],
            [0.8, scaleValue],
            Extrapolation.CLAMP
          ),
        },
      ],
    }),
    []
  );

  // --- Event Handlers ---

  // Clear the category and related fields
  const handleClearCategory = (
    setFieldValue: (
      field: string,
      value: any,
      shouldValidate?: boolean | undefined
    ) => void
  ) => {
    setFieldValue('category', null);
    setFieldValue('brand', null);
    setFieldValue('accountName', '');
    setFieldValue('accountNumber', '');
    setFieldValue('metadata', '');
  };

  // Clear the selected brand
  const handleClearBrand = (
    setFieldValue: (
      field: string,
      value: any,
      shouldValidate?: boolean | undefined
    ) => void
  ) => {
    setFieldValue('brand', null);
  };

  // Clear the selected metadata type
  const handleClearMetadataType = (
    setFieldValue: (
      field: string,
      value: any,
      shouldValidate?: boolean | undefined
    ) => void
  ) => {
    setFieldValue('metadataType', metadataTypeData[0]);
  };

  const onNavigateBack = useCallback(() => router.back(), []);

  // Open the appropriate bottom sheet
  const onOpenSheet = useCallback(
    (
      type: SheetType,
      category: CategoryItem | null,
      setFieldValue: (
        field: string,
        value: any,
        shouldValidate?: boolean | undefined
      ) => void
    ) => {
      if (type === 'brand' && !category) {
        // More descriptive alert message:
        // Alert.alert(
        //   t('addScreen.selectCategoryFirstTitle'),
        //   t('addScreen.selectCategoryFirstMessage'),
        //   [{ text: t('addScreen.ok') }]
        // );
        showToast(t('addScreen.selectCategoryFirstMessage'));
        return;
      } else 
      if (type === 'metadataType' && !category) {
        showToast(t('addScreen.selectCategoryFirstMessage'));
        return;
      }
      setIsSheetOpen(true);
      setSheetType(type);
      bottomSheetRef.current?.snapToIndex(0);
      Keyboard.dismiss();
    },
    [t]
  );

  // Handle selection from a bottom sheet
  const handleSheetItemSelect = useCallback(
    (
      item: SheetItem,
      type: SheetType,
      setFieldValue: (
        field: string,
        value: any,
        shouldValidate?: boolean | undefined
      ) => void
    ) => {
      switch (type) {
        case 'category':
          setFieldValue('category', item as CategoryItem);
          setFieldValue('brand', null); // Clear brand when category changes
          setFieldValue('metadataType', metadataTypeData[0]); // Reset metadataType
          setFieldValue('accountName', '');
          setFieldValue('accountNumber', '');
          setFieldValue('metadata', '');
          break;
        case 'brand':
          setFieldValue('brand', item as BrandItem);
          break;
        case 'metadataType':
          setFieldValue('metadataType', item as MetadataTypeItem);
          break;
      }
      bottomSheetRef.current?.close();
      setSheetType(null);
      setIsSheetOpen(false);
    },
    [metadataTypeData]
  );

  // --- Rendering Functions ---

  // Render the card preview
  const renderCardItem = useCallback(
    (
      metadata: string,
      accountName: string,
      accountNumber: string,
      category: CategoryItem | null,
      brand: BrandItem | null,
      metadataType: MetadataTypeItem | null
    ) => (
      <ThemedCardItem
        accountName={accountName}
        accountNumber={accountNumber}
        code={codeProvider ? codeProvider : brand?.code || ''}  // Use codeProvider if available, otherwise brand code
        type={category?.value || 'store'} // Default to 'store' if no category
        metadata={metadata}
        metadata_type={metadataType?.value}
        animatedStyle={cardStyle}
      />
    ),
    [cardStyle, codeProvider]
  );

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setIsToastVisible(true);
    setTimeout(() => {
      setIsToastVisible(false);
    }, 2500);
  }, []);

  // Render an item within a bottom sheet
  const renderSheetItem = useCallback(
    (
      item: SheetItem,
      category: CategoryItem | null,
      brand: BrandItem | null,
      metadataType: MetadataTypeItem | null,
      setFieldValue: (
        field: string,
        value: any,
        shouldValidate?: boolean | undefined
      ) => void
    ) => {
      if (!item) return null;

      // Determine the type of item
      const isCategory =
        'value' in item && ['store', 'bank', 'ewallet'].includes(item.value);
      const isMetadataType =
        'value' in item && ['qr', 'barcode'].includes(item.value);
      const isBrand = 'code' in item;

      // Check if the current item is selected
      const isSelected = isCategory
        ? category?.value === item.value
        : isBrand
          ? brand?.code === item.code
          : isMetadataType
            ? metadataType?.value === item.value
            : false;

      const commonProps = {
        item,
        isSelected,
        iconColors,
        textColors: colors,
      };

      // Render the appropriate sheet item component based on type
      switch (true) {
        case isCategory:
          return (
            <CategorySheetItem
              {...commonProps}
              onPress={() => handleSheetItemSelect(item, 'category', setFieldValue)}
            />
          );
        case isBrand:
          return (
            <BrandSheetItem
              {...commonProps}
              onPress={() => handleSheetItemSelect(item, 'brand', setFieldValue)}
            />
          );
        case isMetadataType:
          return (
            <MetadataTypeSheetItem
              {...commonProps}
              onPress={() =>
                handleSheetItemSelect(item, 'metadataType', setFieldValue)
              }
            />
          );
        default:
          return null;
      }
    },
    [colors, handleSheetItemSelect, iconColors]
  );

  // Category data for the bottom sheet
  const categoryData: CategoryItem[] = useMemo(
    () => [
      { display: t('addScreen.bankCategory'), value: 'bank' },
      { display: t('addScreen.ewalletCategory'), value: 'ewallet' },
      { display: t('addScreen.storeCategory'), value: 'store' },
    ],
    [t]
  );

  // Dynamically generate the data for the bottom sheet based on the sheet type
  const sheetData = useCallback(
    (category: CategoryItem | null) => {
      switch (sheetType) {
        case 'category':
          return categoryData;
        case 'brand':
          // Only show brands of the selected category type.
          return category ? getItemsByTypeHelper(category.value as DataType, locale) : [];
        case 'metadataType':
          return metadataTypeData;
        default:
          return [];
      }
    },
    [sheetType, categoryData, metadataTypeData, getItemsByTypeHelper, locale]
  );

  // Key extractor for FlatList components
  const keyExtractor = useCallback((item: SheetItem | unknown) => {
    return 'value' in (item as SheetItem)
      ? (item as CategoryItem | MetadataTypeItem).value
      : 'code' in (item as SheetItem)
        ? (item as BrandItem).code
        : String(item);
  }, []);

  // --- Form Submission ---

  // Handle form submission
  const handleFormSubmit = useCallback(
    async (values: FormParams, formikHelpers: FormikHelpers<FormParams>) => {
      try {
        console.log('Submitting values:', values);
        router.replace('/(auth)/home');  // Navigate to home screen after submission
      } catch (error) {
        console.error('Submission error:', error);
        Alert.alert(
          t('addScreen.submissionErrorTitle'),
          t('addScreen.submissionErrorMessage'),
          [{ text: t('addScreen.ok') }]
        );
      } finally {
        formikHelpers.setSubmitting(false); // Ensure 'submitting' state is reset
      }
    },
    [router, t]
  );

  const handleSheetChange = useCallback((index: number) => {
    setIsSheetOpen(index !== -1); // Update sheet visibility state
  }, []);

  // --- Animation for Account/Number Section ---
  // Determine whether to show the account details section
  const shouldShowAccountSection = useCallback(
    (category: CategoryItem | null) => {
      return (
        category?.value !== 'store' &&
        typeof category?.value === 'string' &&
        category.value.length > 0
      );
    },
    []
  );

  useEffect(() => {
    // Once the URL params are available, set isReady to true.
    if (codeType !== undefined) { // Or any other param that indicates readiness
      setIsReady(true);
    }
  }, [codeType]);

  return (
    <Formik<FormParams>
      initialValues={initialValues}
      validationSchema={qrCodeSchema}
      onSubmit={handleFormSubmit}
      enableReinitialize={isReady}  // Only enable after isReady is true
      initialTouched={useMemo(() => ({
        brand: !!initialValues.brand, // Mark as touched if brand is pre-populated
      }), [initialValues.brand])}
    >
      {({
        handleChange,
        handleBlur,
        handleSubmit,
        values,
        errors,
        touched,
        isSubmitting,
        setFieldValue,
        setTouched
      }) => (
        <ThemedView style={styles.container}>
          <ThemedTopToast message={toastMessage} isVisible={isToastVisible}/>
          <Animated.View style={[styles.titleContainer, titleContainerStyle]}>
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
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScroll={scrollHandler}
            scrollEnabled={true}
          >
            {renderCardItem(
              values.metadata,
              values.accountName,
              values.accountNumber,
              values.category,
              values.brand,
              values.metadataType
            )}
            <ThemedView
              style={[styles.formContainer, { backgroundColor: sectionsColors }]}
            >
              <ThemedDisplayInput
                iconName="format-list-bulleted-type"
                placeholder={t('addScreen.categoryPlaceholder')}
                value={values.category?.display}
                onPress={() =>
                  onOpenSheet('category', values.category, setFieldValue)
                }
                onClear={() => handleClearCategory(setFieldValue)}
                errorMessage={
                  touched.category && errors.category
                    ? String(errors.category)
                    : undefined
                }
                isError={touched.category && !!errors.category}
              />
              <ThemedDisplayInput
                iconName="domain"
                placeholder={t('addScreen.brandPlaceholder')}
                logoCode={codeProvider ? codeProvider : values.brand?.code}
                value={values.brand?.full_name}
                onPress={() =>
                  onOpenSheet('brand', values.category, setFieldValue)
                }
                onClear={() => handleClearBrand(setFieldValue)}
                // Removed disabled prop
                errorMessage={
                  touched.brand && errors.brand ? String(errors.brand) : undefined
                }
                isError={touched.brand && !!errors.brand}
              />
              <ThemedInput
                iconName="credit-card-outline"
                placeholder={t('addScreen.metadataPlaceholder')}
                value={values.metadata}
                onChangeText={handleChange('metadata')}
                onBlur={handleBlur('metadata')}
                backgroundColor={sectionsColors}
                disabled={!!codeValue || !values.category || !values.brand}
                disableOpacityChange={true}
                errorMessage={
                  touched.metadata && errors.metadata
                    ? String(errors.metadata)
                    : undefined
                }
                isError={touched.metadata && !!errors.metadata}
              />
              <ThemedDisplayInput
                iconName="qrcode"
                placeholder={t('addScreen.metadataTypePlaceholder')}
                value={values.metadataType?.display}
                onPress={() =>
                  onOpenSheet('metadataType', values.category, setFieldValue)
                }
                onClear={() => handleClearMetadataType(setFieldValue)}
                showClearButton={false}
              />
            </ThemedView>

            {/* Conditionally Render with Animation */}
            {shouldShowAccountSection(values.category) && (
              <Animated.View
                style={[
                  styles.formContainer,
                  { backgroundColor: sectionsColors },
                ]}
                entering={FadeIn.duration(300)}
                exiting={FadeOut.duration(300)}
              >
                <ThemedInput
                  iconName="account"
                  placeholder={t('addScreen.accountNamePlaceholder')}
                  value={values.accountName}
                  onChangeText={handleChange('accountName')}
                  onBlur={handleBlur('accountName')}
                  backgroundColor={sectionsColors}
                  disabled={!values.metadata}
                  disableOpacityChange={true}
                  errorMessage={
                    touched.accountName && errors.accountName
                      ? String(errors.accountName)
                      : undefined
                  }
                  isError={touched.accountName && !!errors.accountName}
                />
                <ThemedInput
                  iconName="account-cash"
                  placeholder={t('addScreen.accountNumberPlaceholder')}
                  value={values.accountNumber}
                  onChangeText={handleChange('accountNumber')}
                  onBlur={handleBlur('accountNumber')}
                  backgroundColor={sectionsColors}
                  keyboardType="numeric"
                  disabled={!values.metadata}
                  disableOpacityChange={true}
                  errorMessage={
                    touched.accountNumber && errors.accountNumber
                      ? String(errors.accountNumber)
                      : undefined
                  }
                  isError={touched.accountNumber && !!errors.accountNumber}
                />
              </Animated.View>
            )}

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
            snapPoints={
              sheetType === 'category'
                ? ['32%']
                : sheetType === 'metadataType'
                  ? ['25%']
                  : ['40%', '80%']
            }
            onChange={handleSheetChange}
            contentType="flat"
            contentProps={{
              flatListProps: {
                data: sheetData(values.category),  // Pass the current category to sheetData
                showsVerticalScrollIndicator: false,
                renderItem: ({ item }) =>
                  renderSheetItem(
                    item as SheetItem,
                    values.category,
                    values.brand,
                    values.metadataType,
                    setFieldValue
                  ),
                keyExtractor: keyExtractor,
                style: {
                  ...styles.flatListStyle,
                  backgroundColor: sectionsColors,
                },
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