import React, { useCallback, useEffect, useState } from 'react';
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
     // Use a fixed base size and only scale it slightly.
    const buttonWidth = getResponsiveWidth(20); // Adjust the base (20%) as needed

    return (
      <Pressable
        onPress={() => {
          handlePress(item.key);
        }}
        style={({ pressed }) => [
          styles.filterButton,
          {width: buttonWidth}, // Apply the calculated width
          isDarkMode ? styles.darkModeButton : styles.lightModeButton,
          isSelected && (isDarkMode ? styles.selectedFilterDarkMode : styles.selectedFilterLightMode),
        ]}
      >
        <View style={styles.iconView}>
          <MaterialCommunityIcons
            name={isSelected ? item.iconName : `${item.iconName}-outline`}
            size={getResponsiveFontSize(20)}  // Responsive font size, but consider a fixed size too
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
  const screenWidth = Dimensions.get('window').width;

  const [filterKey, setFilterKey] = useState(0);

  useEffect(() => {
    setFilterKey((prev) => prev + 1);
  }, [locale]);

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

  const handlePress = useCallback(
    (filterKey: string) => {
      onFilterChange(filterKey);
    },
    [onFilterChange]
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


  // Calculate dynamic gap based on screen width
  const calculateGap = () => {
    const baseGap = 2; // Minimum gap
    const numItems = filters.length;
    const buttonWidth = getResponsiveWidth(20); // Adjust based on your button's desired width
    const totalButtonWidth = buttonWidth * numItems;
    const padding = getResponsiveWidth(3.6) * 2;  // Total horizontal padding

    const availableSpace = screenWidth - totalButtonWidth - padding;
    const maxGap = availableSpace / (numItems -1);
    
     // Use a minimum width to decide when to reduce the gap.  Adjust as necessary.
    const minWidthForMaxGap = 50 ;

     if(screenWidth >= minWidthForMaxGap)
       return Math.min(maxGap,getResponsiveWidth(8)); // limit gap for extremely wide screens,adjust getResponsiveWidth(8) as you see the limit
     else
       return getResponsiveWidth(baseGap); // on smaller screens use getResponsiveWidth
  };
    const gap = calculateGap();

  return (
    <FlatList
      horizontal
      key={filterKey}
      data={filters}
      keyExtractor={(item) => `${locale}-${item.key}-${filterKey}`}
      renderItem={renderItem}
      extraData={[selectedFilter, locale, filterKey, screenWidth]}
      contentContainerStyle={[styles.filterContainer, {gap:gap},style]} //apply dynamic gap
      showsHorizontalScrollIndicator={false}
      scrollEnabled={true}
    />
  );
};
const styles = StyleSheet.create({
  filterContainer: {
    // flex: 1, // Removed flex: 1
    // gap: getResponsiveWidth(2),  // Dynamic gap is now handled directly
    paddingHorizontal: getResponsiveWidth(3.6), // Keep consistent padding
    // justifyContent: 'space-between',//removed
    alignItems: 'center', // Vertically center items
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsiveHeight(1.5),   // Vertical padding - adjust as needed
    // paddingHorizontal: getResponsiveWidth(4.5), // Removed dynamic horizontal padding inside the button
    borderRadius: getResponsiveWidth(4),          // Adjust as needed
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
    paddingHorizontal: getResponsiveWidth(3.6), // Keep consistent padding
  },
});
export default ThemedFilter;