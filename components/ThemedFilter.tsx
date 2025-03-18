import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  FlatList,
  StyleProp,
  ViewStyle,
  StyleSheet,
  View,
  Pressable,
  Dimensions,
} from 'react-native';
import { t } from '@/i18n';
import { useLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import {
  getResponsiveFontSize,
  getResponsiveWidth,
  getResponsiveHeight,
} from '@/utils/responsive';

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
    const buttonWidth = getResponsiveWidth(20); // Fixed width for buttons
    const iconSize = getResponsiveFontSize(20); // Fixed icon size

    return (
      <Pressable
        onPress={() => handlePress(item.key)}
        style={({ pressed }) => [
          styles.filterButton,
          { width: buttonWidth },
          isDarkMode ? styles.darkModeButton : styles.lightModeButton,
          isSelected &&
            (isDarkMode ? styles.selectedFilterDarkMode : styles.selectedFilterLightMode),
        ]}
      >
        <View style={styles.iconView}>
          <MaterialCommunityIcons
            name={isSelected ? item.iconName : `${item.iconName}-outline`}
            size={iconSize}
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
    prevProps.isDarkMode === nextProps.isDarkMode
);

FilterItem.displayName = 'FilterItem';

const ThemedFilter = ({ selectedFilter, onFilterChange, style }: ThemedFilterProps) => {
  const { locale } = useLocale();
  const { currentTheme } = useTheme();
  const isDarkMode = currentTheme === 'dark';
  const screenWidth = Dimensions.get('window').width;

  const [filterKey, setFilterKey] = useState(0);

  useEffect(() => {
    setFilterKey((prev) => prev + 1);
  }, [locale]);

  const filters: FilterItemType[] = useMemo(
    () => [
      { key: 'all', label: t('homeScreen.filters.all'), iconName: 'view-grid' },
      { key: 'bank', label: t('homeScreen.filters.bank'), iconName: 'bank' },
      { key: 'ewallet', label: t('homeScreen.filters.ewallet'), iconName: 'wallet' },
      { key: 'store', label: t('homeScreen.filters.store'), iconName: 'ticket-percent' },
    ],
    [locale]
  );

  const handlePress = useCallback(
    (filterKey: string) => {
      onFilterChange(filterKey);
    },
    [onFilterChange]
  );

  const gap = useMemo(() => {
    const baseGap = 2; // Minimum gap
    const numItems = filters.length;
    const buttonWidth = getResponsiveWidth(20); // Fixed button width
    const totalButtonWidth = buttonWidth * numItems;
    const padding = getResponsiveWidth(3.6) * 2; // Total horizontal padding
    const availableSpace = screenWidth - totalButtonWidth - padding;
    const maxGap = availableSpace / (numItems - 1);

    return Math.min(maxGap, getResponsiveWidth(8)); // Limit gap for wide screens
  }, [screenWidth, filters.length]);

  return (
    <FlatList
      horizontal
      key={filterKey}
      data={filters}
      keyExtractor={(item) => `${locale}-${item.key}-${filterKey}`}
      renderItem={({ item }) => (
        <FilterItem
          item={item}
          isSelected={selectedFilter === item.key}
          isDarkMode={isDarkMode}
          handlePress={handlePress}
        />
      )}
      contentContainerStyle={[styles.filterContainer, { gap }, style]}
      showsHorizontalScrollIndicator={false}
      scrollEnabled={true}
    />
  );
};

const styles = StyleSheet.create({
  filterContainer: {
    paddingHorizontal: getResponsiveWidth(3.6),
    alignItems: 'center',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsiveHeight(1.5),
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
  iconView: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: getResponsiveWidth(3.6),
  },
});

export default ThemedFilter;
