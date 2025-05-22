// QRForm.tsx
import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import { StyleSheet, View, Keyboard, Platform } from "react-native";
import { Formik, FormikHelpers } from "formik";
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
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import ModalManager from "../modals/ModalManager";

const AnimatedKeyboardAwareScrollView =
  Animated.createAnimatedComponent(KeyboardAwareScrollView);

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
  isMetadataLoading?: boolean; // Added prop for VietQR loading
}

const QRForm: React.FC<QRFormProps> = ({
  initialValues,
  onSubmit,
  isEditing,
  onNavigateBack,
  codeProvider,
  isMetadataLoading = false, // Default to false
}) => {
  // Context and theme setup
  const { currentTheme } = useTheme();
  const { locale: currentLocale } = useLocale();
  const locale = currentLocale ?? "en";
  const {
    text: colors,
    icon: iconColors,
    cardBackground: sectionsColors,
    inputBackground: inputBackgroundColor, // For consistency
  } = Colors[currentTheme];

  // State management
  const isSheetVisible = useRef(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetType, setSheetType] = useState<SheetType | null>(null);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastKey, setToastKey] = useState(0);

  // Refs
  const bottomSheetRef = useRef<BottomSheet>(null);
  const modalManagerRef = useRef<any>(null);
  const openSheetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Animation setup
  const scrollY = useSharedValue(0);
  const scrollThreshold = getResponsiveHeight(7);
  const animationRange = getResponsiveHeight(5);
  const translateYValue = -getResponsiveHeight(3);
  const scaleValue = 0.8;

  // Memoized data
  const categoryData: CategoryItem[] = useMemo(
    () => [
      { display: t("addScreen.bankCategory"), value: "bank" },
      { display: t("addScreen.ewalletCategory"), value: "ewallet" },
      { display: t("addScreen.storeCategory"), value: "store" },
    ],
    [t], // Assuming t is stable or add it if i18n re-instantiates it
  );

  const metadataTypeData: MetadataTypeItem[] = useMemo(
    () => [
      { display: t("addScreen.qr"), value: "qr" },
      { display: t("addScreen.barcode"), value: "barcode" },
    ],
    [t], // Assuming t is stable
  );

  useEffect(() => {
    return () => {
      if (openSheetTimeoutRef.current) {
        clearTimeout(openSheetTimeoutRef.current);
      }
    };
  }, []);

  function mapDataTypeToBrandItemType(
    dataType: DataType,
  ): "bank" | "ewallet" | "store" {
    switch (dataType) {
      case "bank":
      case "vietqr": // vietqr maps to bank type for BrandItem
        return "bank";
      case "ewallet":
        return "ewallet";
      case "store":
        return "store";
      default:
        // This ensures that all paths return a value or throw.
        // You might want to log the unexpected dataType or handle it differently.
        console.warn(`Unexpected DataType encountered: ${dataType}`);
        // Fallback or throw, depending on how strict you want to be.
        // For now, let's assume it might be a new type that can be treated as 'store'.
        return "store"; // Or throw new Error(`Unexpected DataType: ${dataType}`);
    }
  }

  const getItemsByTypeHelper = useCallback(
    (type: DataType, locale: string): BrandItem[] =>
      returnItemsByType(type).map((item) => ({
        code: item.code,
        name: item.name,
        full_name: item.full_name[locale] || item.name, // Fallback to name
        type: mapDataTypeToBrandItemType(type),
        ...(type === "bank" || type === "store" || type === "ewallet"
          ? { bin: item.bin }
          : {}),
      })),
    [locale], // returnItemsByType should be stable if it's a pure function
  );

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setIsToastVisible(true);
    setToastKey((prevKey) => prevKey + 1);
  }, []);

  const onToastHidden = useCallback(() => {
    setIsToastVisible(false);
  }, []);

  const handleFieldClear = useCallback(
    (
      field: "category" | "brand" | "metadataType",
      setFieldValue: (
        field: string,
        value: any,
        shouldValidate?: boolean,
      ) => void,
    ) => {
      switch (field) {
        case "category":
          setFieldValue("category", null);
          setFieldValue("brand", null);
          setFieldValue("accountName", "");
          setFieldValue("accountNumber", "");
          setFieldValue("metadata", "");
          break;
        case "brand":
          setFieldValue("brand", null);
          break;
        case "metadataType":
          setFieldValue("metadataType", metadataTypeData[0]);
          break;
      }
    },
    [metadataTypeData],
  );

  const onEmptyInputPress = useCallback(
    (inputType: string) => {
      showToast(t("addScreen.errors.emptyInputMessage"));
    },
    [t, showToast],
  );

  const shouldShowAccountSection = useCallback(
    (category: CategoryItem | null) =>
      category?.value === "bank" || category?.value === "ewallet",
    [],
  );

  const sheetData = useCallback(
    (category: CategoryItem | null) => {
      switch (sheetType) {
        case "category":
          return categoryData;
        case "brand":
          return category
            ? getItemsByTypeHelper(category.value as DataType, locale)
            : [];
        case "metadataType":
          return metadataTypeData;
        default:
          return [];
      }
    },
    [sheetType, categoryData, metadataTypeData, getItemsByTypeHelper, locale],
  );

  const onOpenSheet = useCallback(
    (
      type: SheetType,
      category: CategoryItem | null,
      setFieldValue: (
        field: string,
        value: any,
        shouldValidate?: boolean,
      ) => void,
    ) => {
      if (isMetadataLoading) return; // Don't open sheet if metadata is loading

      if ((type === "brand" || type === "metadataType") && !category) {
        showToast(t("addScreen.errors.selectCategoryFirstMessage"));
        return;
      }

      setSheetType(type);
      Keyboard.dismiss();

      if (openSheetTimeoutRef.current) {
        clearTimeout(openSheetTimeoutRef.current);
      }

      requestAnimationFrame(() => {
        setIsSheetOpen(true);
        openSheetTimeoutRef.current = setTimeout(() => {
          bottomSheetRef.current?.snapToIndex(0);
        }, 150);
      });
    },
    [t, showToast, isMetadataLoading],
  );

  const handleSheetItemSelect = useCallback(
    (
      item: SheetItem,
      type: SheetType,
      setFieldValue: (
        field: string,
        value: any,
        shouldValidate?: boolean,
      ) => void,
    ) => {
      switch (type) {
        case "category":
          const newCategory = item as CategoryItem;
          setFieldValue("category", newCategory);
          setFieldValue("brand", null); // Reset brand
          // Reset bank/ewallet specific fields if new category is not bank/ewallet
          if (newCategory.value === "store") {
            setFieldValue("accountName", "");
            setFieldValue("accountNumber", "");
          }
          // If switching to bank, metadata might be auto-generated, so clear it
          // or let AddScreen handle it. For now, let form reflect user action.
          // setFieldValue("metadata", "");
          break;
        case "brand":
          setFieldValue("brand", item as BrandItem);
          break;
        case "metadataType":
          setFieldValue("metadataType", item as MetadataTypeItem);
          break;
      }
      bottomSheetRef.current?.close();
    },
    [],
  );

  const handleSheetChange = useCallback((index: number) => {
    isSheetVisible.current = index !== -1;
    setIsSheetOpen(index !== -1);
  }, []);

  const keyExtractor = useCallback(
    (item: SheetItem | unknown) =>
      item && typeof item === "object"
        ? "value" in item
          ? (item as CategoryItem | MetadataTypeItem).value
          : "code" in item
            ? (item as BrandItem).code
            : String(Date.now() + Math.random()) // Fallback key
        : String(item),
    [],
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

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
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
    [isSheetOpen],
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
    [],
  );

  const renderCardItem = useCallback(
    (
      metadata: string,
      accountName: string,
      accountNumber: string,
      category: CategoryItem | null,
      brand: BrandItem | null,
      metadataType: MetadataTypeItem | null,
    ) => (
      <ThemedCardItem
        accountName={accountName}
        accountNumber={accountNumber}
        code={codeProvider ? codeProvider : brand?.code || ""}
        type={category?.value || "store"}
        metadata={metadata}
        metadata_type={metadataType?.value}
        animatedStyle={cardStyle}
        cardHolderStyle={{
          maxWidth: getResponsiveWidth(40),
          fontSize: getResponsiveFontSize(12),
        }}
        // Consider adding an isMetadataLoading prop to ThemedCardItem if you want shimmer there too
        // isContentLoading={isMetadataLoading && category?.value === 'bank'}
      />
    ),
    [cardStyle, codeProvider /*, isMetadataLoading - if ThemedCardItem supports it */],
  );

  const renderSheetItem = useCallback(
    (
      item: SheetItem,
      category: CategoryItem | null,
      brand: BrandItem | null,
      metadataType: MetadataTypeItem | null,
      setFieldValue: (
        field: string,
        value: any,
        shouldValidate?: boolean,
      ) => void,
    ) => {
      if (!item) return null;

      const isCategory =
        "value" in item &&
        ["store", "bank", "ewallet"].includes(item.value);
      const isMetadataType =
        "value" in item && ["qr", "barcode"].includes(item.value);
      const isBrand = "code" in item;

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

      if (isCategory) {
        return (
          <CategorySheetItem
            {...commonProps}
            onPress={() =>
              handleSheetItemSelect(item, "category", setFieldValue)
            }
          />
        );
      } else if (isBrand) {
        return (
          <BrandSheetItem
            {...commonProps}
            onPress={() => handleSheetItemSelect(item, "brand", setFieldValue)}
          />
        );
      } else if (isMetadataType) {
        return (
          <MetadataTypeSheetItem
            {...commonProps}
            onPress={() =>
              handleSheetItemSelect(item, "metadataType", setFieldValue)
            }
          />
        );
      }
      return null;
    },
    [colors, handleSheetItemSelect, iconColors],
  );

  return (
    <Formik<FormParams>
      initialValues={initialValues}
      validationSchema={qrCodeSchema} // Make sure qrCodeSchema is flexible or updates with category
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
        dirty,
      }) => {
        const formDisabled = isSubmitting || isMetadataLoading;

        return (
          <ThemedView style={styles.container}>
            <ThemedTopToast
              key={toastKey}
              message={toastMessage}
              isVisible={isToastVisible}
              onVisibilityToggle={onToastHidden}
              duration={2000}
            />

            <Animated.View style={[styles.titleContainer, titleContainerStyle]}>
              <View style={styles.headerContainer}>
                <View style={styles.titleButtonContainer}>
                  <ThemedButton
                    iconName="chevron-left"
                    style={styles.titleButton}
                    disabled={formDisabled}
                    onPress={() => {
                      if (dirty && !formDisabled) {
                        modalManagerRef.current?.showModal();
                      } else if (!formDisabled) {
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
              contentContainerStyle={styles.scrollViewContent}
              enableOnAndroid={true}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onScroll={scrollHandler}
              scrollEnabled={!isSheetOpen && !formDisabled} // Disable scroll when sheet is open or form is globally disabled
            >
              {renderCardItem(
                values.metadata,
                values.accountName,
                values.accountNumber,
                values.category,
                values.brand,
                values.metadataType,
              )}

              <ThemedView
                style={[
                  styles.formContainer,
                  { backgroundColor: sectionsColors },
                ]}
              >
                <ThemedDisplayInput
                  iconName="format-list-bulleted-type"
                  placeholder={t("addScreen.categoryPlaceholder")}
                  value={values.category?.display}
                  onPress={() =>
                    onOpenSheet("category", values.category, setFieldValue)
                  }
                  onClear={() => handleFieldClear("category", setFieldValue)}
                  errorMessage={
                    touched.category && errors.category
                      ? String(errors.category)
                      : undefined
                  }
                  isError={touched.category && !!errors.category}
                  disabled={formDisabled}
                />

                <ThemedDisplayInput
                  iconName="domain"
                  placeholder={t("addScreen.brandPlaceholder")}
                  logoCode={codeProvider ? codeProvider : values.brand?.code}
                  value={values.brand?.full_name}
                  onPress={() =>
                    onOpenSheet("brand", values.category, setFieldValue)
                  }
                  onClear={() => handleFieldClear("brand", setFieldValue)}
                  errorMessage={
                    touched.brand && errors.brand
                      ? String(errors.brand)
                      : undefined
                  }
                  isError={touched.brand && !!errors.brand}
                  disabled={formDisabled}
                />

                {/* Bank QR Data Display - Shows loading shimmer */}
                {values.category?.value === "bank" && (
                  <Animated.View
                    style={{ backgroundColor: sectionsColors }}
                    entering={FadeIn.duration(300)}
                    exiting={FadeOut.duration(300)}
                  >
                    <ThemedDisplayInput
                      iconName="qrcode-scan"
                      label={t("addScreen.qrCodeDataLabel")} // Add this translation
                      value={values.metadata}
                      isLoading={isMetadataLoading} // HERE is the loading prop
                      showClearButton={false}
                      disabled={formDisabled} // General disable state
                      // You might want to add multiline & numberOfLines if QR data is long
                      // multiline={true}
                      // numberOfLines={3}
                      placeholder={
                        isMetadataLoading
                          ? t("addScreen.qrLoadingPlaceholder") // Add this translation
                          : t("addScreen.qrGeneratedPlaceholder") // Add this
                      }
                    />
                  </Animated.View>
                )}

                {/* Store/Ewallet Metadata Input */}
                {(values.category?.value === "store" ||
                  values.category?.value === "ewallet") && (
                  <Animated.View
                    style={{ backgroundColor: sectionsColors }}
                    entering={FadeIn.duration(300)}
                    exiting={FadeOut.duration(300)}
                  >
                    <ThemedInput
                      iconName="credit-card-outline"
                      placeholder={t("addScreen.metadataPlaceholder")}
                      value={values.metadata}
                      onChangeText={handleChange("metadata")}
                      onBlur={handleBlur("metadata")}
                      backgroundColor={inputBackgroundColor} // Use consistent input background
                      disabled={
                        (!!codeProvider && !isEditing) || formDisabled
                      }
                      disableOpacityChange={false}
                      errorMessage={
                        touched.metadata && errors.metadata
                          ? String(errors.metadata)
                          : undefined
                      }
                      isError={touched.metadata && !!errors.metadata}
                      onDisabledPress={() => onEmptyInputPress("metadata")}
                    />
                  </Animated.View>
                )}

                <ThemedDisplayInput
                  iconName="qrcode"
                  placeholder={t("addScreen.metadataTypePlaceholder")}
                  value={values.metadataType?.display}
                  onPress={() =>
                    onOpenSheet("metadataType", values.category, setFieldValue)
                  }
                  onClear={() =>
                    handleFieldClear("metadataType", setFieldValue)
                  }
                  showClearButton={false} // Usually metadata type is required
                  disabled={formDisabled}
                />
              </ThemedView>

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
                    placeholder={t("addScreen.accountNamePlaceholder")}
                    value={values.accountName}
                    onChangeText={handleChange("accountName")}
                    onBlur={handleBlur("accountName")}
                    backgroundColor={inputBackgroundColor}
                    disableOpacityChange={false}
                    errorMessage={
                      touched.accountName && errors.accountName
                        ? String(errors.accountName)
                        : undefined
                    }
                    isError={touched.accountName && !!errors.accountName}
                    onDisabledPress={() => onEmptyInputPress("account")}
                    disabled={formDisabled}
                  />

                  <ThemedInput
                    iconName="account-cash"
                    placeholder={t("addScreen.accountNumberPlaceholder")}
                    value={values.accountNumber}
                    onChangeText={handleChange("accountNumber")}
                    onBlur={handleBlur("accountNumber")}
                    backgroundColor={inputBackgroundColor}
                    keyboardType="numeric"
                    disableOpacityChange={false}
                    errorMessage={
                      touched.accountNumber && errors.accountNumber
                        ? String(errors.accountNumber)
                        : undefined
                    }
                    isError={touched.accountNumber && !!errors.accountNumber}
                    onDisabledPress={() => onEmptyInputPress("account")}
                    disabled={formDisabled}
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
                // Show button loader for general submit, not if only metadata input is loading
                loading={isSubmitting && !isMetadataLoading}
                loadingLabel={
                  isEditing ? t("editScreen.saving") : t("addScreen.saving")
                }
              />
            </AnimatedKeyboardAwareScrollView>

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
                  data: sheetData(values.category),
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
                    backgroundColor: sectionsColors,
                  },
                },
              }}
            />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingHorizontal: getResponsiveWidth(4.8),
    paddingTop: getResponsiveHeight(18), // Increased to ensure title is visible initially
    paddingBottom: getResponsiveHeight(5), // Padding at the bottom
  },
  titleContainer: {
    position: "absolute",
    top: getResponsiveHeight(Platform.OS === "ios" ? 7 : 5), // Adjusted for status bar
    left: 0,
    right: 0,
    // backgroundColor: Colors.light.background, // Or use theme background
    zIndex: 10, // Ensure it's above scroll content initially
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: getResponsiveWidth(4.8),
    paddingVertical: getResponsiveHeight(1),
    // backgroundColor: Colors.light.background, // Or use theme background
    gap: getResponsiveWidth(4.8),
  },
  titleButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: getResponsiveWidth(4.8),
  },
  title: {
    fontSize: getResponsiveFontSize(28),
    fontWeight: "bold",
  },
  titleButton: {
    // Add styles if needed, e.g., padding for touch area
  },
  formContainer: {
    justifyContent: "center",
    borderRadius: getResponsiveWidth(4),
    marginTop: getResponsiveHeight(1.2),
    marginBottom: getResponsiveHeight(2.4),
    padding: getResponsiveWidth(1), // Small padding inside form sections
  },
  saveButton: {
    marginTop: getResponsiveHeight(2.4),
    marginBottom: getResponsiveHeight(3), // Ensure button is not cut off
  },
  flatListStyle: {
    borderRadius: getResponsiveWidth(4),
    marginHorizontal: getResponsiveWidth(3.6),
    marginBottom: getResponsiveHeight(3.6),
  },
});

export default React.memo(QRForm);
