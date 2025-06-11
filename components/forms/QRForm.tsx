// QRForm.tsx
import React, {
  useCallback,
  useMemo,
  useRef,
  useEffect,
  useState,
} from "react";
import {
  StyleSheet,
  View,
  Keyboard,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Formik, FormikHelpers, FormikProps } from "formik";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import BottomSheet from "@gorhom/bottom-sheet";
import { Colors } from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { t } from "@/i18n";
import { ThemedButton } from "@/components/buttons/ThemedButton";
import ThemedCardItem from "@/components/cards/ThemedCardItem";
import { ThemedInput, ThemedDisplayInput } from "@/components/Inputs";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import ThemedReuseableSheet from "@/components/bottomsheet/ThemedReusableSheet";
import {
  CategorySheetItem,
  BrandSheetItem,
  MetadataTypeSheetItem,
} from "@/components/bottomsheet/SheetItem";
import { qrCodeSchema } from "@/utils/validationSchemas";
import { returnItemsByType } from "@/utils/returnItemData";
import { useLocale } from "@/context/LocaleContext";
import {
  getResponsiveFontSize,
  getResponsiveWidth,
  getResponsiveHeight,
} from "@/utils/responsive";
import DataType from "@/types/dataType";
import { ThemedTopToast } from "@/components/toast/ThemedTopToast";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import ModalManager from "../modals/ModalManager";

const AnimatedKeyboardAwareScrollView =
  Animated.createAnimatedComponent(KeyboardAwareScrollView);

// --- Type definitions (unchanged) ---
export interface CategoryItem {
  display: string;
  value: "bank" | "ewallet" | "store";
}
export interface BrandItem {
  code: string;
  name: string;
  full_name: string;
  type: "bank" | "ewallet" | "store";
  bin?: string;
}
export interface MetadataTypeItem {
  display: string;
  value: "qr" | "barcode";
}
export type SheetItem = CategoryItem | BrandItem | MetadataTypeItem;
export type SheetType = "category" | "brand" | "metadataType";
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
  onSubmit: (
    values: FormParams,
    formikHelpers: FormikHelpers<FormParams>,
  ) => Promise<void>;
  isEditing: boolean;
  onNavigateBack: () => void;
  codeProvider?: string;
  isMetadataLoading?: boolean;
  formikRef?: React.Ref<FormikProps<FormParams>>;
  onAttemptBankMetadataFetch?: (
    accountNumber: string,
    accountName: string,
    brandBin: string,
  ) => Promise<{ qrCode?: string | null; error?: string | null } | null>;
}

const DEBOUNCE_DELAY = 750;
const BRAND_PAGE_SIZE = 10;

// --- BankMetadataFetcher (unchanged) ---
const BankMetadataFetcher: React.FC<{
  values: FormParams;
  isParentLoading: boolean;
  onAttemptBankMetadataFetch?: QRFormProps["onAttemptBankMetadataFetch"];
  setFieldValue: FormikProps<FormParams>["setFieldValue"];
  setFieldError: FormikProps<FormParams>["setFieldError"];
  showToast: (message: string) => void;
  setCardMetadata: (metadata: string) => void;
}> = React.memo(
  ({
    values,
    isParentLoading,
    onAttemptBankMetadataFetch,
    setFieldValue,
    setFieldError,
    showToast,
    setCardMetadata,
  }) => {
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const completedFetchesRef = useRef<Set<string>>(new Set());
    const activeRequestRef = useRef<boolean>(false);

    const { accountName, accountNumber, category, brand, metadata } = values;
    const brandBin = brand?.bin;
    const categoryValue = category?.value;

    const handleError = useCallback(
      (error: string) => {
        setFieldError("metadata", error);
        showToast(error);
      },
      [setFieldError, showToast],
    );

    useEffect(() => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (
        !onAttemptBankMetadataFetch ||
        categoryValue !== "bank" ||
        !brandBin ||
        !accountName?.trim() ||
        !accountNumber?.trim() ||
        (metadata && metadata.trim()) ||
        isParentLoading ||
        activeRequestRef.current
      ) {
        return;
      }
      const currentDetailsKey = JSON.stringify({
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
        brandBin,
      });
      if (completedFetchesRef.current.has(currentDetailsKey)) return;

      debounceTimeoutRef.current = setTimeout(async () => {
        if (
          activeRequestRef.current ||
          isParentLoading ||
          completedFetchesRef.current.has(currentDetailsKey)
        ) {
          return;
        }
        activeRequestRef.current = true;
        try {
          const result = await onAttemptBankMetadataFetch(
            accountNumber.trim(),
            accountName.trim(),
            brandBin,
          );
          if (result?.qrCode) {
            setFieldValue("metadata", result.qrCode);
            setCardMetadata(result.qrCode); // Update card preview
            setFieldError("metadata", undefined);
            completedFetchesRef.current.add(currentDetailsKey);
          } else if (result?.error) {
            handleError(result.error);
          } else {
            handleError(t("addScreen.vietQrApiError"));
          }
        } catch (error) {
          console.error("Fetch error:", error);
          handleError(t("addScreen.vietQrApiError"));
        } finally {
          activeRequestRef.current = false;
        }
      }, DEBOUNCE_DELAY);

      return () => {
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
      };
    }, [
      accountName,
      accountNumber,
      brandBin,
      categoryValue,
      metadata,
      onAttemptBankMetadataFetch,
      isParentLoading,
      setFieldValue,
      setFieldError,
      handleError,
      setCardMetadata,
    ]);

    useEffect(() => {
      completedFetchesRef.current.clear();
      activeRequestRef.current = false;
    }, [categoryValue, brandBin]);

    return null;
  },
);

const QRForm: React.FC<QRFormProps> = ({
  initialValues,
  onSubmit,
  isEditing,
  onNavigateBack,
  codeProvider,
  isMetadataLoading = false,
  formikRef,
  onAttemptBankMetadataFetch,
}) => {
  // --- Hooks and State (mostly unchanged) ---
  const { currentTheme } = useTheme();
  const { locale: currentLocale } = useLocale();
  const locale = currentLocale ?? "en";

  const {
    text: colorPalette,
    icon: iconColors,
    cardBackground: sectionsColors,
    inputBackground: inputBackgroundColor,
  } = Colors[currentTheme];

  const [cardCategory, setCardCategory] = useState(initialValues.category);
  const [cardBrand, setCardBrand] = useState(initialValues.brand);
  const [cardMetadataType, setCardMetadataType] = useState(
    initialValues.metadataType,
  );
  const [cardMetadata, setCardMetadata] = useState(initialValues.metadata);
  const [cardAccountName, setCardAccountName] = useState(
    initialValues.accountName,
  );
  const [cardAccountNumber, setCardAccountNumber] = useState(
    initialValues.accountNumber,
  );

  useEffect(() => {
    setCardCategory(initialValues.category);
    setCardBrand(initialValues.brand);
    setCardMetadataType(initialValues.metadataType);
    setCardMetadata(initialValues.metadata);
    setCardAccountName(initialValues.accountName);
    setCardAccountNumber(initialValues.accountNumber);
  }, [initialValues]);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetType, setSheetType] = useState<SheetType | null>(null);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastKey, setToastKey] = useState(0);
  const [displayedBrandItems, setDisplayedBrandItems] = useState<BrandItem[]>(
    [],
  );
  const [brandItemsOffset, setBrandItemsOffset] = useState<number>(0);
  const [hasMoreBrandItems, setHasMoreBrandItems] = useState<boolean>(true);
  const [isFetchingNextBrandBatch, setIsFetchingNextBrandBatch] =
    useState<boolean>(false);

  const isSheetVisible = useRef(false);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const modalManagerRef = useRef<any>(null);
  const openSheetTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const allBrandsForCurrentCategoryRef = useRef<BrandItem[]>([]);
  const lastLoadedBrandCategoryValueRef = useRef<string | null | undefined>(
    null,
  );

  const scrollY = useSharedValue(0);
  const scrollThreshold = getResponsiveHeight(7);
  const animationRange = getResponsiveHeight(5);
  const translateYValue = -getResponsiveHeight(3);
  const scaleValue = 0.8;

  // --- Data and Callbacks (mostly unchanged) ---
  const categoryData: CategoryItem[] = useMemo(
    () => [
      { display: t("addScreen.bankCategory"), value: "bank" },
      { display: t("addScreen.ewalletCategory"), value: "ewallet" },
      { display: t("addScreen.storeCategory"), value: "store" },
    ],
    [],
  );
  const metadataTypeData: MetadataTypeItem[] = useMemo(
    () => [
      { display: t("addScreen.qr"), value: "qr" },
      { display: t("addScreen.barcode"), value: "barcode" },
    ],
    [],
  );

  const mapDataTypeToBrandItemType = useCallback(
    (dataType: DataType): "bank" | "ewallet" | "store" => {
      switch (dataType) {
        case "bank":
        case "vietqr":
          return "bank";
        case "ewallet":
          return "ewallet";
        case "store":
          return "store";
        default:
          console.warn(`Unexpected DataType encountered: ${dataType}`);
          return "store";
      }
    },
    [],
  );

  const getItemsByTypeHelper = useCallback(
    (type: DataType, localeStr: string): BrandItem[] =>
      returnItemsByType(type).map((item) => ({
        code: item.code,
        name: item.name,
        full_name: item.full_name[localeStr] || item.name,
        type: mapDataTypeToBrandItemType(type),
        ...(type === "bank" || type === "store" || type === "ewallet"
          ? { bin: item.bin }
          : {}),
      })),
    [mapDataTypeToBrandItemType],
  );

  const prepareAllBrandsForCategory = useCallback(
    (categoryValue: DataType) => {
      allBrandsForCurrentCategoryRef.current = getItemsByTypeHelper(
        categoryValue,
        locale,
      );
    },
    [getItemsByTypeHelper, locale],
  );

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setIsToastVisible(true);
    setToastKey((prevKey) => prevKey + 1);
  }, []);

  const onToastHidden = useCallback(() => {
    setIsToastVisible(false);
  }, []);

  const shouldShowAccountSection = useCallback(
    (category: CategoryItem | null) =>
      category?.value === "bank" || category?.value === "ewallet",
    [],
  );

  const loadBrandItems = useCallback(
    async (
      categoryValue: DataType,
      currentOffset: number,
      isInitialLoad: boolean = false,
    ) => {
      if (isFetchingNextBrandBatch && !isInitialLoad) return;
      setIsFetchingNextBrandBatch(true);

      if (
        isInitialLoad ||
        lastLoadedBrandCategoryValueRef.current !== categoryValue
      ) {
        prepareAllBrandsForCategory(categoryValue);
        lastLoadedBrandCategoryValueRef.current = categoryValue;
      }

      const allItems = allBrandsForCurrentCategoryRef.current;
      const newItems = allItems.slice(
        currentOffset,
        currentOffset + BRAND_PAGE_SIZE,
      );

      if (isInitialLoad) {
        setDisplayedBrandItems(newItems);
      } else {
        setDisplayedBrandItems((prevItems) => [...prevItems, ...newItems]);
      }
      const newOffset = currentOffset + newItems.length;
      setBrandItemsOffset(newOffset);
      setHasMoreBrandItems(newOffset < allItems.length);
      setIsFetchingNextBrandBatch(false);
    },
    [isFetchingNextBrandBatch, prepareAllBrandsForCategory],
  );

  const handleLoadMoreBrands = useCallback(() => {
    const currentCategoryValue =
      formikRef && typeof formikRef !== "function" && formikRef.current
        ? formikRef.current.values.category?.value
        : null;

    if (
      sheetType === "brand" &&
      !isFetchingNextBrandBatch &&
      hasMoreBrandItems &&
      currentCategoryValue
    ) {
      loadBrandItems(
        currentCategoryValue as DataType,
        brandItemsOffset,
        false,
      );
    }
  }, [
    sheetType,
    isFetchingNextBrandBatch,
    hasMoreBrandItems,
    loadBrandItems,
    brandItemsOffset,
    formikRef,
  ]);

  const handleFieldClear = useCallback(
    (
      field: "category" | "brand" | "metadataType",
      setFieldValue: FormikProps<FormParams>["setFieldValue"],
    ) => {
      switch (field) {
        case "category":
          setFieldValue("category", null);
          setCardCategory(null);
          setFieldValue("brand", null);
          setCardBrand(null);
          setFieldValue("accountName", "");
          setCardAccountName("");
          setFieldValue("accountNumber", "");
          setCardAccountNumber("");
          setDisplayedBrandItems([]);
          setBrandItemsOffset(0);
          setHasMoreBrandItems(true);
          lastLoadedBrandCategoryValueRef.current = null;
          allBrandsForCurrentCategoryRef.current = [];
          break;
        case "brand":
          setFieldValue("brand", null);
          setCardBrand(null);
          break;
        case "metadataType":
          setFieldValue("metadataType", metadataTypeData[0]);
          setCardMetadataType(metadataTypeData[0]);
          break;
      }
    },
    [metadataTypeData],
  );

  const onEmptyInputPress = useCallback(() => {
    showToast(t("addScreen.errors.emptyInputMessage"));
  }, [showToast]);

  const onOpenSheet = useCallback(
    (type: SheetType, currentCategoryFromForm: CategoryItem | null) => {
      if (isMetadataLoading) return;
      if (
        (type === "brand" || type === "metadataType") &&
        !currentCategoryFromForm
      ) {
        showToast(t("addScreen.errors.selectCategoryFirstMessage"));
        return;
      }
      setSheetType(type);
      Keyboard.dismiss();

      if (type === "brand" && currentCategoryFromForm?.value) {
        if (
          lastLoadedBrandCategoryValueRef.current !==
          currentCategoryFromForm.value ||
          displayedBrandItems.length === 0
        ) {
          setDisplayedBrandItems([]);
          setBrandItemsOffset(0);
          setHasMoreBrandItems(true);
          loadBrandItems(
            currentCategoryFromForm.value as DataType,
            0,
            true,
          );
        }
      }

      if (openSheetTimeoutRef.current) {
        clearTimeout(openSheetTimeoutRef.current);
      }
      requestAnimationFrame(() => {
        setIsSheetOpen(true);
        openSheetTimeoutRef.current = setTimeout(
          () => bottomSheetRef.current?.snapToIndex(0),
          Platform.OS === "ios" ? 50 : 50,
        );
      });
    },
    [isMetadataLoading, showToast, loadBrandItems, displayedBrandItems.length],
  );

  const handleSheetItemSelect = useCallback(
    (
      item: SheetItem,
      type: SheetType,
      setFieldValue: FormikProps<FormParams>["setFieldValue"],
      currentCategoryInForm: CategoryItem | null,
    ) => {
      bottomSheetRef.current?.close();
      switch (type) {
        case "category":
          const newCategory = item as CategoryItem;
          const oldCategoryValue = currentCategoryInForm?.value;

          setFieldValue("category", newCategory);
          setCardCategory(newCategory);
          setFieldValue("brand", null);
          setCardBrand(null);

          if (newCategory.value === "store") {
            setFieldValue("accountName", "");
            setCardAccountName("");
            setFieldValue("accountNumber", "");
            setCardAccountNumber("");
          }

          if (newCategory.value !== oldCategoryValue) {
            setDisplayedBrandItems([]);
            setBrandItemsOffset(0);
            setHasMoreBrandItems(true);
            lastLoadedBrandCategoryValueRef.current = null;
            allBrandsForCurrentCategoryRef.current = [];
          }
          break;
        case "brand":
          const newBrand = item as BrandItem;
          setFieldValue("brand", newBrand);
          setCardBrand(newBrand);
          break;
        case "metadataType":
          const newMetaType = item as MetadataTypeItem;
          setFieldValue("metadataType", newMetaType);
          setCardMetadataType(newMetaType);
          break;
      }
    },
    [],
  );

  const handleSheetChange = useCallback((index: number) => {
    isSheetVisible.current = index !== -1;
    setIsSheetOpen(index !== -1);
  }, []);

  const sheetData = useCallback(() => {
    switch (sheetType) {
      case "category":
        return categoryData;
      case "brand":
        return displayedBrandItems;
      case "metadataType":
        return metadataTypeData;
      default:
        return [];
    }
  }, [sheetType, categoryData, metadataTypeData, displayedBrandItems]);

  const keyExtractor = useCallback((item: SheetItem, index?: number): string => {
    const currentIndex: number = typeof index === "number" ? index : -1;
    if (typeof item !== "object" || item === null) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `KeyExtractor received non-object item at index ${currentIndex}:`,
          item,
        );
      }
      return `invalid-item-${currentIndex}`;
    }
    if ("code" in item && typeof item.code === "string") return item.code;
    if ("value" in item && typeof item.value === "string") return item.value;
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `KeyExtractor couldn't determine key for item at index ${currentIndex}:`,
        item,
      );
    }
    return `fallback-key-for-index-${currentIndex}`;
  }, []);

  const renderSheetItem = useCallback(
    (
      item: SheetItem,
      currentCategoryFromForm: CategoryItem | null,
      currentBrandFromForm: BrandItem | null,
      currentMetaTypeFromForm: MetadataTypeItem | null,
      setFieldValue: FormikProps<FormParams>["setFieldValue"],
    ) => {
      if (!item) return null;
      const isCategory =
        "value" in item && ["store", "bank", "ewallet"].includes(item.value);
      const isMetadataType =
        "value" in item && ["qr", "barcode"].includes(item.value);
      const isBrand = "code" in item;

      const commonProps = {
        item,
        iconColors,
        textColors: colorPalette,
        isSelected: false,
        onPress: () =>
          handleSheetItemSelect(
            item,
            sheetType!,
            setFieldValue,
            currentCategoryFromForm,
          ),
      };
      if (isCategory) {
        commonProps.isSelected =
          currentCategoryFromForm?.value === (item as CategoryItem).value;
        return <CategorySheetItem {...commonProps} />;
      }
      if (isBrand) {
        commonProps.isSelected =
          currentBrandFromForm?.code === (item as BrandItem).code;
        return <BrandSheetItem {...commonProps} />;
      }
      if (isMetadataType) {
        commonProps.isSelected =
          currentMetaTypeFromForm?.value === (item as MetadataTypeItem).value;
        return <MetadataTypeSheetItem {...commonProps} />;
      }
      return null;
    },
    [colorPalette, iconColors, handleSheetItemSelect, sheetType],
  );

  // --- *** CHANGE #1: renderCardItemDisplay no longer needs cardStyle *** ---
  const renderCardItemDisplay = useCallback(
    () => (
      <ThemedCardItem
        accountName={cardAccountName}
        accountNumber={cardAccountNumber}
        code={codeProvider || cardBrand?.code || ""}
        type={cardCategory?.value || "store"}
        metadata={cardMetadata}
        metadata_type={cardMetadataType?.value}
        // animatedStyle is removed from here
        cardHolderStyle={{
          maxWidth: getResponsiveWidth(40),
          fontSize: getResponsiveFontSize(12),
        }}
      />
    ),
    [
      cardAccountName,
      cardAccountNumber,
      codeProvider,
      cardBrand,
      cardCategory,
      cardMetadata,
      cardMetadataType,
    ],
  );

  const handleFormSubmit = useCallback(
    async (
      values: FormParams,
      formikHelpers: FormikHelpers<FormParams>,
    ) => {
      Keyboard.dismiss();
      await onSubmit(values, formikHelpers);
    },
    [onSubmit],
  );

  const updateCardStateOnBlur = useCallback(
    (fieldName: keyof FormParams, fieldValue: string) => {
      switch (fieldName) {
        case "metadata":
          setCardMetadata(fieldValue);
          break;
        case "accountName":
          setCardAccountName(fieldValue);
          break;
        case "accountNumber":
          setCardAccountNumber(fieldValue);
          break;
        default:
          break;
      }
    },
    [],
  );

  // --- Animated Styles (unchanged) ---
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => (scrollY.value = event.contentOffset.y),
  });
  const titleContainerStyle = useAnimatedStyle(
    () => ({
      opacity: interpolate(
        scrollY.value,
        [scrollThreshold, scrollThreshold + animationRange],
        [1, 0],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          translateY: interpolate(
            scrollY.value,
            [0, scrollThreshold],
            [0, translateYValue],
            Extrapolation.CLAMP,
          ),
        },
      ],
      zIndex: isSheetOpen ? 0 : 1,
    }),
    [isSheetOpen, scrollThreshold, animationRange, translateYValue],
  );
  const cardStyle = useAnimatedStyle(
    () => ({
      transform: [
        {
          scale: interpolate(
            scrollY.value,
            [0, scrollThreshold],
            [1, scaleValue],
            Extrapolation.CLAMP,
          ),
        },
      ],
    }),
    [scrollThreshold, scaleValue],
  );

  // --- useEffects (unchanged) ---
  useEffect(() => {
    if (initialValues.category?.value) {
      if (
        lastLoadedBrandCategoryValueRef.current !==
        initialValues.category.value ||
        allBrandsForCurrentCategoryRef.current.length === 0
      ) {
        prepareAllBrandsForCategory(initialValues.category.value as DataType);
        lastLoadedBrandCategoryValueRef.current =
          initialValues.category.value;
      }
    }
  }, [initialValues.category, prepareAllBrandsForCategory]);

  useEffect(() => {
    return () => {
      if (openSheetTimeoutRef.current) {
        clearTimeout(openSheetTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Formik<FormParams>
      innerRef={formikRef}
      initialValues={initialValues}
      validationSchema={qrCodeSchema}
      onSubmit={handleFormSubmit}
      enableReinitialize={true}
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
        setFieldError,
        dirty,
        isValid,
      }) => {
        const formDisabled =
          !isValid ||
          (isEditing && !dirty) ||
          isSubmitting ||
          isMetadataLoading;

        const createFormFieldBlurHandler = (
          fieldName: keyof FormParams,
        ) => {
          return (e: any) => {
            handleBlur(fieldName)(e);
            const fieldValue = values[fieldName];
            if (
              fieldName === "metadata" ||
              fieldName === "accountName" ||
              fieldName === "accountNumber"
            ) {
              updateCardStateOnBlur(fieldName, String(fieldValue ?? ""));
            }
          };
        };

        return (
          <ThemedView style={styles.container}>
            <BankMetadataFetcher
              values={values}
              isParentLoading={isMetadataLoading}
              onAttemptBankMetadataFetch={onAttemptBankMetadataFetch}
              setFieldValue={setFieldValue}
              setFieldError={setFieldError}
              showToast={showToast}
              setCardMetadata={setCardMetadata}
            />
            <ThemedTopToast
              key={toastKey}
              message={toastMessage}
              isVisible={isToastVisible}
              onVisibilityToggle={onToastHidden}
              duration={3000}
            />
            <Animated.View
              style={[styles.titleContainer, titleContainerStyle]}
            >
              <View style={styles.headerContainer}>
                <View style={styles.titleButtonContainer}>
                  <ThemedButton
                    iconName="chevron-left"
                    style={styles.titleButton}
                    disabled={isSubmitting || isMetadataLoading}
                    onPress={() => {
                      if (dirty && !isSubmitting && !isMetadataLoading) {
                        modalManagerRef.current?.showModal();
                      } else if (!isSubmitting && !isMetadataLoading) {
                        onNavigateBack();
                      }
                    }}
                  />
                </View>
                <ThemedText style={styles.title} type="title">
                  {isEditing ? t("editScreen.title") : t("addScreen.title")}
                </ThemedText>
              </View>
            </Animated.View>
            <AnimatedKeyboardAwareScrollView
              // Use the new content container style
              onScroll={scrollHandler}
              contentContainerStyle={styles.scrollViewContent}
              // `bottomOffset` adds padding between the focused input and the keyboard
              bottomOffset={25}
              // `keyboardShouldPersistTaps` is a standard ScrollView prop.
              // "handled" is best for forms, as it prevents the keyboard from
              // closing when you tap a button.
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* --- *** CHANGE #2: Wrap the component in an Animated.View *** --- */}
              <Animated.View style={cardStyle}>
                {renderCardItemDisplay()}
              </Animated.View>

              <ThemedView style={[styles.formContainer]}>
                <ThemedDisplayInput
                  iconName="format-list-bulleted-type"
                  placeholder={t("addScreen.categoryPlaceholder")}
                  value={values.category?.display}
                  onPress={() => onOpenSheet("category", values.category)}
                  onClear={() => handleFieldClear("category", setFieldValue)}
                  errorMessage={
                    touched.category && errors.category
                      ? String(errors.category)
                      : undefined
                  }
                  isError={touched.category && !!errors.category}
                  disabled={isSubmitting || isMetadataLoading}
                />
                <ThemedDisplayInput
                  iconName="domain"
                  placeholder={t("addScreen.brandPlaceholder")}
                  logoCode={codeProvider || values.brand?.code}
                  value={values.brand?.full_name}
                  onPress={() => onOpenSheet("brand", values.category)}
                  onClear={() => handleFieldClear("brand", setFieldValue)}
                  errorMessage={
                    touched.brand && errors.brand
                      ? String(errors.brand)
                      : undefined
                  }
                  isError={touched.brand && !!errors.brand}
                  disabled={isSubmitting || isMetadataLoading}
                />
                {values.category?.value === "bank" && (
                  <Animated.View
                    style={{ backgroundColor: sectionsColors }}
                    entering={FadeIn.duration(300)}
                    exiting={FadeOut.duration(300)}
                  >
                    <ThemedDisplayInput
                      iconName="qrcode-scan"
                      label={t("addScreen.qrCodeDataLabel")}
                      value={values.metadata}
                      isLoading={isMetadataLoading}
                      showClearButton={false}
                      disabled={true}
                      placeholder={
                        isMetadataLoading
                          ? t("addScreen.qrLoadingPlaceholder")
                          : values.metadata ||
                          t("addScreen.qrGeneratedPlaceholder")
                      }
                      errorMessage={
                        touched.metadata && errors.metadata
                          ? String(errors.metadata)
                          : undefined
                      }
                      isError={touched.metadata && !!errors.metadata}
                    />
                  </Animated.View>
                )}
                {(values.category?.value === "store" ||
                  values.category?.value === "ewallet") && (
                    <Animated.View
                      entering={FadeIn.duration(300)}
                      exiting={FadeOut.duration(300)}
                    >
                      <ThemedInput
                        iconName="credit-card-outline"
                        placeholder={t("addScreen.metadataPlaceholder")}
                        value={values.metadata}
                        onChangeText={handleChange("metadata")}
                        onBlur={createFormFieldBlurHandler("metadata")}
                        disabled={
                          (!!codeProvider && !isEditing) ||
                          isSubmitting ||
                          isMetadataLoading
                        }
                        disableOpacityChange={false}
                        errorMessage={
                          touched.metadata && errors.metadata
                            ? String(errors.metadata)
                            : undefined
                        }
                        isError={touched.metadata && !!errors.metadata}
                        onDisabledPress={onEmptyInputPress}
                      />
                    </Animated.View>
                  )}
                <ThemedDisplayInput
                  iconName="qrcode"
                  placeholder={t("addScreen.metadataTypePlaceholder")}
                  value={values.metadataType?.display}
                  onPress={() =>
                    onOpenSheet("metadataType", values.category)
                  }
                  onClear={() =>
                    handleFieldClear("metadataType", setFieldValue)
                  }
                  showClearButton={false}
                  disabled={isSubmitting || isMetadataLoading}
                />
              </ThemedView>
              {shouldShowAccountSection(values.category) && (
                <Animated.View
                  style={[styles.formContainer]}
                  entering={FadeIn.duration(300)}
                  exiting={FadeOut.duration(300)}
                >
                  <ThemedInput
                    iconName="account"
                    placeholder={t("addScreen.accountNamePlaceholder")}
                    value={values.accountName}
                    onChangeText={handleChange("accountName")}
                    onBlur={createFormFieldBlurHandler("accountName")}
                    disableOpacityChange={false}
                    errorMessage={
                      touched.accountName && errors.accountName
                        ? String(errors.accountName)
                        : undefined
                    }
                    isError={touched.accountName && !!errors.accountName}
                    onDisabledPress={onEmptyInputPress}
                    disabled={isSubmitting || isMetadataLoading}
                  />
                  <ThemedInput
                    iconName="account-cash"
                    placeholder={t("addScreen.accountNumberPlaceholder")}
                    value={values.accountNumber}
                    onChangeText={handleChange("accountNumber")}
                    onBlur={createFormFieldBlurHandler("accountNumber")}
                    keyboardType="numeric"
                    disableOpacityChange={false}
                    errorMessage={
                      touched.accountNumber && errors.accountNumber
                        ? String(errors.accountNumber)
                        : undefined
                    }
                    isError={touched.accountNumber && !!errors.accountNumber}
                    onDisabledPress={onEmptyInputPress}
                    disabled={isSubmitting || isMetadataLoading}
                  />
                </Animated.View>
              )}
              <ThemedButton
                label={
                  isEditing
                    ? t("editScreen.saveButton")
                    : t("addScreen.saveButton")
                }
                onPress={() => handleSubmit()}
                style={styles.saveButton}
                disabled={formDisabled}
                loading={isSubmitting}
                loadingLabel={
                  isEditing ? t("editScreen.saving") : t("addScreen.saving")
                }
              />
            </AnimatedKeyboardAwareScrollView>
            {isSheetOpen && (
              <ThemedReuseableSheet
                ref={bottomSheetRef}
                showSearchBar={sheetType === "brand"}
                title={
                  sheetType === "category"
                    ? t("addScreen.categoryTitle")
                    : sheetType === "brand"
                      ? t("addScreen.brandTitle")
                      : sheetType === "metadataType"
                        ? t("addScreen.metadataTypeTitle")
                        : ""
                }
                snapPoints={
                  sheetType === "category"
                    ? ["32%"]
                    : sheetType === "metadataType"
                      ? ["25%"]
                      : ["85%"]
                }
                onChange={handleSheetChange}
                contentType="flat"
                contentProps={{
                  flatListProps: {
                    data: sheetData(),
                    showsVerticalScrollIndicator: false,
                    renderItem: ({ item }) =>
                      renderSheetItem(
                        item as SheetItem,
                        values.category,
                        values.brand,
                        values.metadataType,
                        setFieldValue,
                      ),
                    keyExtractor: keyExtractor,
                    style: {
                      ...styles.flatListStyle,
                    },
                    onEndReached:
                      sheetType === "brand" ? handleLoadMoreBrands : undefined,
                    onEndReachedThreshold: 0.5,
                    ListFooterComponent:
                      sheetType === "brand" && isFetchingNextBrandBatch ? (
                        <ActivityIndicator
                          size="small"
                          style={{ marginVertical: 20 }}
                        />
                      ) : null,
                    initialNumToRender: BRAND_PAGE_SIZE,
                    maxToRenderPerBatch: BRAND_PAGE_SIZE,
                    windowSize: 10,
                  },
                }}
              />
            )}
            <ModalManager
              ref={modalManagerRef}
              onNavigateBack={onNavigateBack}
              dirty={dirty}
              isSheetVisible={isSheetVisible}
              bottomSheetRef={bottomSheetRef}
            />
          </ThemedView>
        );
      }}
    </Formik>
  );
};

// --- Styles (unchanged) ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollViewContent: {
    flexGrow: 1,
    paddingHorizontal: getResponsiveWidth(4.8),
    paddingTop: getResponsiveHeight(18),
    paddingBottom: getResponsiveHeight(5),
  },
  titleContainer: {
    position: "absolute",
    top: getResponsiveHeight(Platform.OS === "ios" ? 9 : 9),
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: getResponsiveWidth(4.8),
    paddingVertical: getResponsiveHeight(1),
    gap: getResponsiveWidth(4.8),
  },
  titleButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: getResponsiveWidth(4.8),
  },
  title: { fontSize: getResponsiveFontSize(28), fontWeight: "bold" },
  titleButton: {},
  formContainer: {
    justifyContent: "center",
    borderRadius: getResponsiveWidth(4),
    marginTop: getResponsiveHeight(1.2),
    marginBottom: getResponsiveHeight(2.4),
    padding: getResponsiveWidth(1),
    gap: getResponsiveHeight(1.2),
  },
  saveButton: {
    marginTop: getResponsiveHeight(2.4),
    marginBottom: getResponsiveHeight(3),
  },
  flatListStyle: {
    borderRadius: getResponsiveWidth(4),
    marginHorizontal: getResponsiveWidth(3.6),
    marginBottom: getResponsiveHeight(3.6),
  },
});

export default React.memo(QRForm);