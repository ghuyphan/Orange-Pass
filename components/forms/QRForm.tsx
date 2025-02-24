// QRForm.tsx
import React, { useCallback, useMemo, useRef, useState, useImperativeHandle, forwardRef } from 'react'; // Import forwardRef
import { useFocusEffect } from 'expo-router';
import { StyleSheet, View, Keyboard, BackHandler } from 'react-native';
import { Formik, FormikHelpers } from 'formik';
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
    returnItemsByType,
} from '@/utils/returnItemData';
import { useLocale } from '@/context/LocaleContext';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';
import DataType from '@/types/dataType';
import { ThemedTopToast } from '@/components/toast/ThemedTopToast';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { ThemedModal } from '../modals/ThemedIconModal';

const AnimatedKeyboardAwareScrollView = Animated.createAnimatedComponent(
    KeyboardAwareScrollView
);

export interface CategoryItem {
    display: string;
    value: 'bank' | 'ewallet' | 'store';
}

export interface BrandItem {
    code: string;
    name: string;
    full_name: string;
    type: 'bank' | 'ewallet' | 'store';
}

export interface MetadataTypeItem {
    display: string;
    value: 'qr' | 'barcode';
}

export type SheetItem = CategoryItem | BrandItem | MetadataTypeItem;
export type SheetType = 'category' | 'brand' | 'metadataType';

export interface FormParams {
    category: CategoryItem | null;
    brand: BrandItem | null;
    metadataType: MetadataTypeItem;
    metadata: string;
    accountName: string;
    accountNumber: string;
}

interface QRFormProps {
    initialValues: FormParams;
    onSubmit: (values: FormParams, formikHelpers: FormikHelpers<FormParams>) => Promise<void>;
    isEditing: boolean;
    onNavigateBack: () => void;
    codeProvider?: string;
}

// Define the type for the ref that ModalManager exposes
interface ModalManagerRef {
    showModal: () => void;
}

// Helper component to manage the modal's visibility.
const ModalManager = forwardRef<ModalManagerRef, { onNavigateBack: () => void, dirty: boolean }>((props, ref) => { // Use forwardRef and the defined type
    const { onNavigateBack, dirty } = props;
    const [isModalVisible, setIsModalVisible] = useState(false);

    // Expose a method to show the modal.
    const showModal = useCallback(() => {
        setIsModalVisible(true);
    }, []);


    useImperativeHandle(ref, () => ({
        showModal,
    }));

    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                if (isModalVisible) {
                    setIsModalVisible(false);
                    return true;
                }
                if (dirty) {
                    setIsModalVisible(true);
                    return true;
                }
                return false;
            };

            BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
        }, [isModalVisible, dirty, onNavigateBack])
    );

    return (
        <ThemedModal
            isVisible={isModalVisible}
            onDismiss={() => setIsModalVisible(false)}
            onPrimaryAction={() => setIsModalVisible(false)}
            primaryActionText={t('common.back')}
            message={t('common.unsavedChanges')}
            title={t('common.unsavedChangesTitle')}
            secondaryActionText={t('common.discard')}
            onSecondaryAction={() => {
                setIsModalVisible(false);
                onNavigateBack();
            }}
            iconName='warning'
        />
    );
});

ModalManager.displayName = 'ModalManager'; // Add display name

const QRForm: React.FC<QRFormProps> = ({
  initialValues,
  onSubmit,
  isEditing,
  onNavigateBack,
  codeProvider
}) => {
  const { currentTheme } = useTheme();
  const { locale: currentLocale } = useLocale();
  const locale = currentLocale ?? 'en';
  const { text: colors, icon: iconColors, cardBackground: sectionsColors } = Colors[currentTheme];
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetType, setSheetType] = useState<SheetType | null>(null);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const bottomSheetRef = useRef<BottomSheet>(null);
  const scrollY = useSharedValue(0);
  const modalManagerRef = useRef<any>(null);

  // --- Helper Functions --- (These are the same, condensed for brevity)
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

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setIsToastVisible(true);
  }, []);



  const metadataTypeData: MetadataTypeItem[] = useMemo(
    () => [
      { display: t('addScreen.qr'), value: 'qr' },
      { display: t('addScreen.barcode'), value: 'barcode' },
    ],
    [t]
  );

  // --- Animation --- (This stays largely the same)
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const scrollThreshold = getResponsiveHeight(7);
  const animationRange = getResponsiveHeight(5);
  const translateYValue = -getResponsiveHeight(3);
  const scaleValue = 0.8;

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
      zIndex: isSheetOpen ? 0 : 1, // Simplified zIndex.
    }),
    [isSheetOpen] // Make sure to include isSheetOpen here
  );

  const cardStyle = useAnimatedStyle(
    () => ({
      transform: [
        {
          scale: interpolate(
            scrollY.value,
            [0, scrollThreshold],
            [1, scaleValue],
            Extrapolation.CLAMP
          ),
        },
      ],
    }),
    []
  );

  // --- Event Handlers --- (These are mostly the same)
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

  const handleClearBrand = (
    setFieldValue: (
      field: string,
      value: any,
      shouldValidate?: boolean | undefined
    ) => void
  ) => {
    setFieldValue('brand', null);
  };

  const handleClearMetadataType = (
    setFieldValue: (
      field: string,
      value: any,
      shouldValidate?: boolean | undefined
    ) => void
  ) => {
    setFieldValue('metadataType', metadataTypeData[0]);
  };

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
      setIsSheetOpen(true);
      if (type === 'brand' && !category) {
        showToast(t('addScreen.errors.selectCategoryFirstMessage'));
        return;
      } else
        if (type === 'metadataType' && !category) {
          showToast(t('addScreen.selectCategoryFirstMessage'));
          return;
        }



      setSheetType(type);
      setTimeout(() => {
        bottomSheetRef.current?.snapToIndex(0);
      }, 100);
      Keyboard.dismiss();
    },
    [t, showToast]
  );

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
          // setFieldValue('metadataType', metadataTypeData[0]); // Reset metadataType
          setFieldValue('accountName', '');
          setFieldValue('accountNumber', '');
          break;
        case 'brand':
          setFieldValue('brand', item as BrandItem);
          break;
        case 'metadataType':
          setFieldValue('metadataType', item as MetadataTypeItem);
          break;
      }
      bottomSheetRef.current?.close(); // Ensure the sheet is closed!
    },
    [metadataTypeData]
  );

  // --- Rendering Functions --- (These are mostly the same)
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
        cardHolderStyle={{ maxWidth: getResponsiveWidth(40), fontSize: getResponsiveFontSize(12) }}
      />
    ),
    [cardStyle, codeProvider]
  );

  const onVisibilityToggle = useCallback((isVisible: boolean) => {
    setIsToastVisible(isVisible);

  }, []);

  const onEmptyInputPress = useCallback((inputType: string) => {

    switch (inputType) {
      case 'metadata':
        showToast(t('addScreen.errors.emptyInputMessage'));
        break;
      case 'account':
        showToast(t('addScreen.errors.emptyInputMessage'));
        break;
      default:
        break;
    }
  }, [t, showToast]);

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

  const handleSheetChange = useCallback((index: number) => {
    setIsSheetOpen(!(index === -1));
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


  return (
    <Formik<FormParams>
      initialValues={initialValues}
      validationSchema={qrCodeSchema}
      onSubmit={onSubmit}
      enableReinitialize={true} // Keep this for EditScreen
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
        dirty
      }) => (
        console.log(isSubmitting),
        <ThemedView style={styles.container}>
          <ThemedTopToast
            message={toastMessage}
            isVisible={isToastVisible}
            onVisibilityToggle={onVisibilityToggle} // Use the updated callback
            duration={2000}
          />
          <Animated.View style={[styles.titleContainer, titleContainerStyle]}>
            <View style={styles.headerContainer}>
              <View style={styles.titleButtonContainer}>
                <ThemedButton
                  iconName="chevron-left"
                  style={styles.titleButton}
                  onPress={() => {
                    if (dirty) {
                      // Call showModal on the ModalManager ref!
                      modalManagerRef.current?.showModal();
                    } else {
                      onNavigateBack();
                    }
                  }}
                />
              </View>
              <ThemedText style={styles.title} type="title">
                {isEditing ? t('editScreen.title') : t('addScreen.title')} {/* Dynamic Title */}
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
            {/* Card Preview */}
            {renderCardItem(
              values.metadata,
              values.accountName,
              values.accountNumber,
              values.category,
              values.brand,
              values.metadataType
            )}

            {/* Form Fields */}
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
                disabled={!!codeProvider && !isEditing || !values.category || !values.brand} // Disable based on edit mode
                disableOpacityChange={true}
                errorMessage={
                  touched.metadata && errors.metadata
                    ? String(errors.metadata)
                    : undefined
                }
                isError={touched.metadata && !!errors.metadata}
                onDisabledPress={() => onEmptyInputPress('metadata')}

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
                  onDisabledPress={() => onEmptyInputPress('account')}
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
                  onDisabledPress={() => onEmptyInputPress('account')}
                />
              </Animated.View>
            )}

            <ThemedButton
              label={isEditing ? t('editScreen.saveButton') : t('addScreen.saveButton')}
              onPress={handleSubmit}
              style={styles.saveButton}
              disabled={isSubmitting}
              loading={isSubmitting}
              loadingLabel={isEditing ? t('editScreen.saving') : t('addScreen.saving')}
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
          {/* Use the ModalManager component here */}
          <ModalManager ref={modalManagerRef} onNavigateBack={onNavigateBack} dirty={dirty} />
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

export default React.memo(QRForm);