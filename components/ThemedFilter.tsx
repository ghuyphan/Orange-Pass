import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  FlatList,
  StyleProp,
  ViewStyle,
  StyleSheet,
  View,
  Pressable,
  LayoutAnimation,
} from 'react-native';
import { t } from '@/i18n'; // Translation function
import { useLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';

type ThemedFilterProps = {
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
  style?: StyleProp<ViewStyle>;
};

interface FilterItemType {
  key: string;
  label: string;
  iconName: string;
}

const FilterItem = React.memo(
  ({
    item,
    isSelected,
    isDarkMode,
    handlePress,
  }: {
    item: FilterItemType;
    isSelected: boolean;
    isDarkMode: boolean;
    handlePress: (filterKey: string) => void;
  }) => {
    return (
      <Pressable
        onPress={() => {
          handlePress(item.key);
        }}
        style={({ pressed }) => [
          styles.filterButton,
          isDarkMode ? styles.darkModeButton : styles.lightModeButton,
          isSelected && (isDarkMode ? styles.selectedFilterDarkMode : styles.selectedFilterLightMode),
          pressed && { opacity: 0.7 },
        ]}
      >
        <View style={styles.animatedView}>
          <MaterialCommunityIcons
            name={isSelected ? item.iconName : `${item.iconName}-outline`}
            size={getResponsiveFontSize(20)}
            color={
              isSelected
                ? isDarkMode
                  ? Colors.light.icon
                  : Colors.dark.icon
                : isDarkMode
                ? Colors.dark.icon
                : Colors.light.icon
            }
          />
        </View>
      </Pressable>
    );
  },
  (prevProps, nextProps) =>
    prevProps.item.key === nextProps.item.key &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isDarkMode === nextProps.isDarkMode &&
    prevProps.item.label === nextProps.item.label
);

FilterItem.displayName = 'FilterItem';

const ThemedFilter = ({ selectedFilter, onFilterChange, style }: ThemedFilterProps) => {
  const { locale } = useLocale();
  const { currentTheme } = useTheme();
  const isDarkMode = currentTheme === 'dark';

  // State to force re-render and update translations
  const [filterKey, setFilterKey] = useState(0);

  // Add an effect to update filterKey when locale changes
  useEffect(() => {
    setFilterKey((prev) => prev + 1);
  }, [locale]);

  // Generate filters with fresh translations each render
  const filters: FilterItemType[] = [
    {
      key: 'all',
      label: t('homeScreen.filters.all'),
      iconName: 'view-grid',
    },
    {
      key: 'bank',
      label: t('homeScreen.filters.bank'),
      iconName: 'bank',
    },
    {
      key: 'ewallet',
      label: t('homeScreen.filters.ewallet'),
      iconName: 'wallet',
    },
    {
      key: 'store',
      label: t('homeScreen.filters.store'),
      iconName: 'store',
    },
  ];

  const customLayoutAnimation = useMemo(
    () =>
      LayoutAnimation.create(
        250, // Reduced duration
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      ),
    []
  );

  const handlePress = useCallback(
    (filterKey: string) => {
      LayoutAnimation.configureNext(customLayoutAnimation);
      onFilterChange(filterKey);
    },
    [onFilterChange, customLayoutAnimation]
  );

  const renderItem = ({ item }: { item: FilterItemType }) => (
    <FilterItem
      item={item}
      key={`${locale}-${item.key}-${filterKey}`}
      isSelected={selectedFilter === item.key}
      isDarkMode={isDarkMode}
      handlePress={handlePress}
    />
  );

  return (
    <FlatList
      horizontal
      key={filterKey}
      data={filters}
      keyExtractor={(item) => `${locale}-${item.key}-${filterKey}`}
      renderItem={renderItem}
      extraData={[selectedFilter, locale, filterKey]}
      contentContainerStyle={[styles.filterContainer, style]}
      showsHorizontalScrollIndicator={false}
      scrollEnabled={true}
    />
  );
};

const styles = StyleSheet.create({
  filterContainer: {
    flex: 1,
    gap: getResponsiveWidth(2),
    paddingHorizontal: getResponsiveWidth(3.6),
    justifyContent: 'space-between',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: getResponsiveHeight(1.5),
    paddingHorizontal: getResponsiveWidth(4.5),
    borderRadius: getResponsiveWidth(4),
    overflow: 'hidden',
  },
  selectedFilterLightMode: {
    backgroundColor: Colors.light.icon,
  },
  selectedFilterDarkMode: {
    backgroundColor: Colors.dark.icon,
  },
  darkModeButton: {
    backgroundColor: Colors.dark.buttonBackground,
  },
  lightModeButton: {
    backgroundColor: Colors.light.buttonBackground,
  },
  animatedView: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: getResponsiveWidth(3.6),
  },
});

export default ThemedFilter;