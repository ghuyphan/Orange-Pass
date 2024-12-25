import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Pressable, Image, Keyboard } from 'react-native';
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
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Local imports
import { RootState } from '@/store/rootReducer';
import { Colors } from '@/constants/Colors';
import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';
import { useTheme } from '@/context/ThemeContext';
import { t } from '@/i18n';
// Components
import { ThemedButton } from '@/components/buttons/ThemedButton';
import ThemedCardItem from '@/components/cards/ThemedCardItem';
import { ThemedInput, ThemedDisplayInput } from '@/components/Inputs';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import ThemedReuseableSheet from '@/components/bottomsheet/ThemedReusableSheet';

// Utilities
import { qrCodeSchema } from '@/utils/validationSchemas';
import {
  returnItemCodeByBin,
  returnItemData,
  returnItemsByType,
} from '@/utils/returnItemData';
import { getIconPath } from '@/utils/returnIcon';
import { useLocale } from '@/context/LocaleContext';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';

const AnimatedKeyboardAwareScrollView = Animated.createAnimatedComponent(KeyboardAwareScrollView);

type SheetType = 'category' | 'brand' | 'metadataType' | null;

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

interface SheetItemProps {
  item: CategoryItem | BrandItem | MetadataTypeItem;
  isSelected: boolean;
  onPress: () => void;
}

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
  const [sheetType, setSheetType] = useState<SheetType>(null);
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

  const bankCode = useMemo(() => {
    if (codeType !== 'ewallet' && codeBin) {
      return returnItemCodeByBin(codeBin.toString());
    }
    return null;
  }, [codeBin, codeType]);

  const itemCode = useMemo(() => {
    if (codeType === 'ewallet' && codeProvider) {
      return codeProvider;
    } else {
      return bankCode;
    }
  }, [codeType, codeProvider, bankCode]);

  // Update brands when category changes
  useEffect(() => {
    if (category) {
      const items = returnItemsByType(category.value);
      setBrands(
        items.map((item) => ({
          code: item.code,
          name: item.name,
          full_name: item.full_name[locale],
          type: category.value,
        }))
      );
    } else {
      setBrands([]);
    }
  }, [category, currentLocale]);

  // Set initial category based on codeType
  useEffect(() => {
    if (codeType) {
      const categoryMap: { [key: string]: CategoryItem } = {
        store: { display: t('addScreen.storeCategory'), value: 'store' },
        bank: { display: t('addScreen.bankCategory'), value: 'bank' },
        ewallet: { display: t('addScreen.ewalletCategory'), value: 'ewallet' },
      };
      const newCategory = categoryMap[codeType.toString().toLowerCase()];
      if (newCategory) {
        setCategory(newCategory);
      }
    }
  }, [codeType]);

  // Set initial brand based on itemCode
  useEffect(() => {
    if (itemCode) {
      const itemData = returnItemData(itemCode);
      if (itemData) {
        setBrand({
          code: itemCode,
          name: itemData.name,
          full_name: itemData.full_name[locale],
          type: category?.value || 'store', // default type can be adjusted if needed
        });
      }
    }
  }, [itemCode, category]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const scrollThreshold = getResponsiveHeight(7);
  const animationRange = getResponsiveHeight(5);
  const translateYValue = -getResponsiveHeight(3);
  const scaleValue = 0.6;
  const marginBottomValue = getResponsiveHeight(1.8);
  const marginBottomValue2 = -getResponsiveHeight(1.8);


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

    // const marginBottom = interpolate(
    //   scrollY.value,
    //   [0, scrollThreshold],
    //   [marginBottomValue, marginBottomValue2],
    //   Extrapolation.CLAMP
    // );

    return {
      transform: [{ scale }],
      // marginBottom,
    };
  });

  const onNavigateBack = useCallback(() => {
    router.back();
  }, []);

  const onOpenSheet = useCallback(
    (type: SheetType) => {
      setIsSheetOpen(true);
      if (type === 'brand' && !category) {
        // Don't open brand sheet if no category is selected
        return;
      }
      setIsSheetOpen(true);
      setSheetType(type);
      bottomSheetRef.current?.snapToIndex(0);
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

  const renderCardItem = (metadata: string) => {
    return (
      <ThemedCardItem
        code={brand?.code?.toString() || itemCode?.toString() || ''}
        type={category?.value || 'store'} // default type can be adjusted if needed
        metadata={metadata || ''}
        metadata_type={metadataType?.value || 'qr'}
        animatedStyle={cardStyle}
      />
    );
  };

  const CategorySheetItem: React.FC<SheetItemProps> = ({ item, isSelected, onPress }) => {
    const categoryItem = item as CategoryItem;
    return (
      <Pressable
        key={categoryItem.value}
        onPress={onPress}
        style={[styles.sheetItem, isSelected && styles.selectedItem]}
      >
        <MaterialCommunityIcons
          color={iconColors}
          size={getResponsiveFontSize(18)}
          name={
            categoryItem.value === 'store'
              ? 'store-outline'
              : categoryItem.value === 'bank'
                ? 'bank-outline'
                : 'wallet-outline'
          }
        />
        <ThemedText style={styles.sheetItemText}>{categoryItem.display}</ThemedText>
        {isSelected && (
          <MaterialCommunityIcons
            name="check"
            size={getResponsiveFontSize(20)}
            color={colors}
            style={styles.checkIcon}
          />
        )}
      </Pressable>
    );
  };

  const BrandSheetItem: React.FC<SheetItemProps> = ({ item, isSelected, onPress }) => {
    const brandItem = item as BrandItem;
    return (
      <Pressable
        key={brandItem.code}
        onPress={onPress}
        style={[styles.sheetItem, isSelected && styles.selectedItem]}
      >
        <View style={styles.brandIconContainer}>
          <Image source={getIconPath(brandItem.code)} style={styles.brandIcon} />
        </View>
        <View style={{ flexDirection: 'column', flexShrink: 1 }}>
          <ThemedText type="defaultSemiBold" style={styles.brandText}>
            {brandItem.name}
          </ThemedText>
          <ThemedText numberOfLines={1} style={styles.brandFullName}>
            {brandItem.full_name}
          </ThemedText>
        </View>
        {isSelected && (
          <MaterialCommunityIcons
            name="check"
            size={getResponsiveFontSize(20)}
            color={colors}
            style={styles.checkIcon}
          />
        )}
      </Pressable>
    );
  };

  const MetadataTypeSheetItem: React.FC<SheetItemProps> = ({ item, isSelected, onPress }) => {
    const metadataTypeItem = item as MetadataTypeItem;
    return (
      <Pressable
        key={metadataTypeItem.value}
        onPress={onPress}
        style={[styles.sheetItem, isSelected && styles.selectedItem]}
      >
        <MaterialCommunityIcons
          color={iconColors}
          size={getResponsiveFontSize(18)}
          name={metadataTypeItem.value === 'qr' ? 'qrcode-scan' : 'barcode-scan'}
        />
        <ThemedText style={styles.sheetItemText}>{metadataTypeItem.display}</ThemedText>
        {isSelected && (
          <MaterialCommunityIcons
            name="check"
            size={getResponsiveFontSize(20)}
            color={colors}
            style={styles.checkIcon}
          />
        )}
      </Pressable>
    );
  };

  const renderSheetItem = useCallback(
    (item: CategoryItem | BrandItem | MetadataTypeItem) => {
      const isCategory =
        'value' in item && (item.value === 'store' || item.value === 'bank' || item.value === 'ewallet');
      const isMetadataType = 'value' in item && (item.value === 'qr' || item.value === 'barcode');
      const isBrand = 'code' in item;

      const isSelected = isCategory
        ? category?.value === item.value
        : isBrand
          ? brand?.code === item.code
          : isMetadataType
            ? metadataType?.value === item.value
            : false;

      const getItemComponent = () => {
        if (isCategory) {
          return CategorySheetItem;
        } else if (isBrand) {
          return BrandSheetItem;
        } else if (isMetadataType) {
          return MetadataTypeSheetItem;
        }
        return null;
      };

      const ItemComponent = getItemComponent();

      if (!ItemComponent) {
        return null;
      }

      return (
        <ItemComponent
          item={item}
          isSelected={isSelected}
          onPress={() => {
            if (isCategory) {
              setCategory(item as CategoryItem);
              setBrand(null);
            } else if (isBrand) {
              setBrand(item as BrandItem);
            } else if (isMetadataType) {
              setMetadataType(item as MetadataTypeItem);
            }
            bottomSheetRef.current?.close();
            setTimeout(() => {
              setIsSheetOpen(false);
            }, 50);
          }}
        />
      );
    },
    [category, brand, metadataType, theme, iconColors, colors]
  );

  const categoryData: CategoryItem[] = [
    { display: t('addScreen.storeCategory'), value: 'store' },
    { display: t('addScreen.bankCategory'), value: 'bank' },
    { display: t('addScreen.ewalletCategory'), value: 'ewallet' },
  ];

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
                logoCode={brand?.code || values.code}
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
            snapPoints={
              sheetType === 'category'
                ? [getResponsiveHeight(25)]
                : sheetType === 'brand'
                  ? ['90%']
                  : sheetType === 'metadataType'
                    ? [getResponsiveHeight(25)]
                    : [getResponsiveHeight(50)]
            }
            onClose={() => {
              setTimeout(() => {
                setIsSheetOpen(false);
              }, 50);
            }}
            contentType="flat"
            contentProps={{
              flatListProps: {
                data:
                  sheetType === 'category'
                    ? categoryData
                    : sheetType === 'brand'
                      ? brands
                      : sheetType === 'metadataType'
                        ? metadataTypeData
                        : [],
                showsVerticalScrollIndicator: false,
                renderItem: ({ item }) =>
                  renderSheetItem(item as CategoryItem | BrandItem | MetadataTypeItem),
                keyExtractor: (item: unknown, index: number) => {
                  const typedItem = item as CategoryItem | BrandItem | MetadataTypeItem;
                  if ('value' in typedItem) {
                    return typedItem.value;
                  } else if ('code' in typedItem) {
                    return typedItem.code;
                  } else {
                    return index.toString();
                  }
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
    paddingHorizontal: getResponsiveWidth(3.6),
    paddingTop: STATUSBAR_HEIGHT + getResponsiveHeight(8.5),
  },
  titleContainer: {
    position: 'absolute',
    top: STATUSBAR_HEIGHT + getResponsiveHeight(4.5),
    left: 0,
    right: 0,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: getResponsiveWidth(3.6),
    gap: getResponsiveWidth(3.6),
  },
  titleButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveWidth(3.6),
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
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveWidth(3.6),
    paddingVertical: getResponsiveHeight(1.2),
    paddingHorizontal: getResponsiveWidth(2.4),
    borderRadius: getResponsiveWidth(4),
    overflow: 'hidden',
  },
  selectedItem: {
    // backgroundColor: theme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.1)',
  },
  brandIconContainer: {
    width: getResponsiveWidth(9.6),
    height: getResponsiveWidth(9.6),
    borderRadius: getResponsiveWidth(12),
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  brandIcon: {
    width: '60%',
    height: '60%',
    resizeMode: 'contain',
  },
  brandText: {
    fontSize: getResponsiveFontSize(14),
  },
  brandFullName: {
    fontSize: getResponsiveFontSize(12),
    opacity: 0.6,
  },
  checkIcon: {
    marginLeft: 'auto',
  },
  sheetItemText: {
    fontSize: getResponsiveFontSize(16),
  },
});

export default React.memo(AddScreen);