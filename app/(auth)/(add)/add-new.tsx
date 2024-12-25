import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, StyleSheet, View, Pressable, Image } from 'react-native';
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
import ThemedReuseableSheet from '@/components/bottomsheet/ThemedReusableSheet';
import { useTheme } from '@/context/ThemeContext';
import { t } from '@/i18n';
import { qrCodeSchema } from '@/utils/validationSchemas';
import { returnItemCodeByBin, returnItemData, returnItemsByType } from '@/utils/returnItemData';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocales } from 'expo-localization';
import { getIconPath } from '@/utils/returnIcon';
import { useLocale } from '@/context/LocaleContext';

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
  // const locale = useLocales()[0].languageCode ?? 'en';
  const colors = useMemo(() => (theme === 'light' ? Colors.light.text : Colors.dark.text), [theme]);
  const iconColors = useMemo(() => (theme === 'light' ? Colors.light.icon : Colors.dark.icon), [theme]);
  const sectionsColors = useMemo(() => (theme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground), [theme]);

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
      setBrands(items.map(item => ({
        code: item.code,
        name: item.name,
        full_name: item.full_name[locale],
        type: category.value
      })));
    } else {
      setBrands([]);
    }
  }, [category, currentLocale]);

  // Set initial category based on codeType
  useEffect(() => {
    if (codeType) {
      const categoryMap: { [key: string]: CategoryItem } = {
        store: { display: 'Cửa hàng', value: 'store' },
        bank: { display: 'Ngân hàng', value: 'bank' },
        ewallet: { display: 'Ví điện tử', value: 'ewallet' },
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
          type: category?.value || 'store' // default type can be adjusted if needed
        });
      }
    }
  }, [itemCode, category]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

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

  const cardStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [0, 70],
      [0.8, 0.6],
      Extrapolation.CLAMP
    );
    const marginBottom = interpolate(
      scrollY.value,
      [0, 70],
      [15, -15],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ scale }],
      marginBottom
    };
  });

  const onNavigateBack = useCallback(() => {
    router.back();
  }, []);

  const onOpenSheet = useCallback((type: SheetType) => {
    setIsSheetOpen(true);
    if ((type === 'brand' && !category)) {
      // Don't open brand sheet if no category is selected
      return;
    }
    setIsSheetOpen(true);
    setSheetType(type);
    bottomSheetRef.current?.snapToIndex(0);
    if (Keyboard.isVisible()) {
      Keyboard.dismiss();
    }
  }, [category]);

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
          size={18}
          name={
            categoryItem.value === 'store'
              ? 'store-outline'
              : categoryItem.value === 'bank'
                ? 'bank-outline'
                : 'wallet-outline'
          }
        />
        <ThemedText style={styles.sheetItemText}>{categoryItem.display}</ThemedText>
        {isSelected && <MaterialCommunityIcons name="check" size={20} color={colors} style={styles.checkIcon} />}
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
          <ThemedText type="defaultSemiBold" style={styles.brandText}>{brandItem.name}</ThemedText>
          <ThemedText numberOfLines={1} style={styles.brandFullName}>{brandItem.full_name}</ThemedText>
        </View>
        {isSelected && <MaterialCommunityIcons name="check" size={20} color={colors} style={styles.checkIcon} />}

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
          size={18}
          name={metadataTypeItem.value === 'qr' ? 'qrcode-scan' : 'barcode-scan'}
        />
        <ThemedText style={styles.sheetItemText}>{metadataTypeItem.display}</ThemedText>
        {isSelected && <MaterialCommunityIcons name="check" size={20} color={colors} style={styles.checkIcon} />}
      </Pressable>
    );
  };

  const renderSheetItem = useCallback((item: CategoryItem | BrandItem | MetadataTypeItem) => {
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
  }, [category, brand, metadataType, theme, iconColors, colors]);

  const categoryData: CategoryItem[] = [
    { display: 'Cửa hàng', value: 'store' },
    { display: 'Ngân hàng', value: 'bank' },
    { display: 'Ví điện tử', value: 'ewallet' },
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
          console.log("Selected metadata type:", values.metadata_type); // Use this value
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
              <ThemedText style={styles.title} type="title">{t('addScreen.title')}</ThemedText>
            </View>
          </Animated.View>

          <AnimatedKeyboardAwareScrollView
            contentContainerStyle={styles.scrollViewContent}
            enableOnAndroid={true}
            extraScrollHeight={50}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScroll={scrollHandler}
            scrollEnabled={true}
          >
            {renderCardItem(values.metadata)}

            <ThemedView style={[styles.formContainer, { backgroundColor: sectionsColors }]}>
              <ThemedDisplayInput
                iconName='format-list-bulleted-type'
                placeholder='Category'
                value={category?.display}
                onPress={() => onOpenSheet('category')}
                onClear={handleClearCategory}
              />
              <ThemedDisplayInput
                iconName='domain'
                placeholder='Brand'
                logoCode={brand?.code || values.code}
                value={brand?.name || ''}
                onPress={() => onOpenSheet('brand')}
                onClear={handleClearBrand}
                disabled={!category}
              />
              <ThemedInput
                iconName='credit-card-outline'
                placeholder={t('addScreen.metadataPlaceholder')}
                value={values.metadata}
                onChangeText={handleChange('metadata')}
                onBlur={handleBlur('metadata')}
                backgroundColor={sectionsColors}
                disabled={!!codeValue}
              />
              <ThemedDisplayInput
                iconName='qrcode' // Or a more generic icon
                placeholder='Metadata Type'
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
                ? 'Category'
                : sheetType === 'brand'
                  ? 'Brand name'
                  : sheetType === 'metadataType'
                    ? 'Metadata Type'
                    : ''
            }
            snapPoints={
              sheetType === 'category'
                ? ['25%']
                : sheetType === 'brand'
                  ? ['90%']
                  : sheetType === 'metadataType'
                    ? ['25%']
                    : ['50%']
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
                renderItem: ({ item }) => renderSheetItem(item as CategoryItem | BrandItem | MetadataTypeItem),
                keyExtractor: (item: unknown, index: number) => {
                  const typedItem = item as CategoryItem | BrandItem | MetadataTypeItem;
                  if ('value' in typedItem) {
                    return typedItem.value
                  } else if ('code' in typedItem) {
                    return typedItem.code;
                  } else {
                    return index.toString()
                  }
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
  titleButton: {},
  formContainer: {
    justifyContent: 'center',
    borderRadius: 16,
    padding: 5,
  },
  saveButton: {
    marginTop: 20,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  selectedItem: {
    // backgroundColor: theme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.1)',
  },
  brandIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 50,
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
    fontSize: 14,
  },
  brandFullName: {
    fontSize: 12,
    opacity: 0.6,
  },
  checkIcon: {
    marginLeft: 'auto',
  },
  sheetItemText: {
    fontSize: 16,
  },
});

export default React.memo(AddScreen);