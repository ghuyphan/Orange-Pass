import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  FlatList,
  StyleProp,
  ViewStyle,
  StyleSheet,
  Dimensions,
} from "react-native";
import { t } from "@/i18n";
import { useLocale } from "@/context/LocaleContext";
import { useTheme } from "@/context/ThemeContext";
import { Colors } from "@/constants/Colors";
import {
  getResponsiveWidth,
  getResponsiveHeight,
} from "@/utils/responsive";
import { GlassIntensity } from "@/hooks/useGlassStyle";
import { ThemedButton } from "./buttons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
// No longer need reanimated imports here!

type ThemedFilterProps = {
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
  style?: StyleProp<ViewStyle>;
  variant?: "default" | "glass";
  glassIntensity?: GlassIntensity;
};

interface FilterItemType {
  key: string;
  label: string;
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
}

// --- Filter Button (Now Simplified) ---
// This component is now just a simple wrapper that configures ThemedButton.
// The press animation is handled internally by ThemedButton.
const FilterButton = React.memo(
  ({
    item,
    isSelected,
    onPress,
    variant,
    glassIntensity,
    isDarkMode,
  }: {
    item: FilterItemType;
    isSelected: boolean;
    onPress: (key: string) => void;
    variant: "default" | "glass";
    glassIntensity: GlassIntensity;
    isDarkMode: boolean;
  }) => {
    // Define colors and styles based on the selection state
    const selectedStyle = {
      backgroundColor: isDarkMode ? Colors.dark.icon : Colors.light.icon,
    };
    const selectedIconColor = isDarkMode
      ? Colors.dark.buttonBackground
      : Colors.light.buttonBackground;
    const unselectedIconColor = isDarkMode
      ? Colors.dark.icon
      : Colors.light.icon;

    return (
      <ThemedButton
        onPress={() => onPress(item.key)} // Directly call the handler
        iconName={item.iconName}
        variant={isSelected ? "solid" : variant}
        iconColor={isSelected ? selectedIconColor : unselectedIconColor}
        style={[styles.filterButton, isSelected && selectedStyle]}
        glassIntensity={glassIntensity}
        // Set debounce to 0 for instant feedback on filter taps
        debounceTime={0}
      />
    );
  }
);

const ThemedFilter = ({
  selectedFilter,
  onFilterChange,
  style,
  variant = "default",
  glassIntensity = "medium",
}: ThemedFilterProps) => {
  const { locale } = useLocale();
  const { currentTheme } = useTheme();
  const isDarkMode = currentTheme === "dark";
  const screenWidth = Dimensions.get("window").width;

  const [filterKey, setFilterKey] = useState(0);

  useEffect(() => {
    setFilterKey((prev) => prev + 1);
  }, [locale]);

  const filters: FilterItemType[] = useMemo(
    () => [
      { key: "all", label: t("homeScreen.filters.all"), iconName: "grid" },
      { key: "bank", label: t("homeScreen.filters.bank"), iconName: "bank" },
      {
        key: "ewallet",
        label: t("homeScreen.filters.ewallet"),
        iconName: "wallet",
      },
      {
        key: "store",
        label: t("homeScreen.filters.store"),
        iconName: "ticket-percent",
      },
    ],
    [locale]
  );

  const handleFilterChange = useCallback(
    (filterKey: string) => {
      onFilterChange(filterKey);
    },
    [onFilterChange]
  );

  const gap = useMemo(() => {
    const numItems = filters.length;
    const buttonWidth = getResponsiveWidth(20);
    const totalButtonWidth = buttonWidth * numItems;
    const padding = getResponsiveWidth(3.6) * 2;
    const availableSpace = screenWidth - totalButtonWidth - padding;
    const calculatedGap = availableSpace / (numItems > 1 ? numItems - 1 : 1);
    return Math.min(Math.max(calculatedGap, 8), getResponsiveWidth(8));
  }, [screenWidth, filters.length]);

  const renderFilterItem = useCallback(
    ({ item }: { item: FilterItemType }) => {
      const isSelected = selectedFilter === item.key;
      return (
        <FilterButton
          item={item}
          isSelected={isSelected}
          onPress={handleFilterChange}
          variant={variant}
          glassIntensity={glassIntensity}
          isDarkMode={isDarkMode}
        />
      );
    },
    [
      selectedFilter,
      isDarkMode,
      handleFilterChange,
      variant,
      glassIntensity,
    ]
  );

  return (
    <FlatList
      horizontal
      key={filterKey}
      data={filters}
      keyExtractor={(item) => `${locale}-${item.key}-${filterKey}`}
      renderItem={renderFilterItem}
      contentContainerStyle={[styles.filterContainer, { gap }, style]}
      showsHorizontalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  filterContainer: {
    paddingHorizontal: getResponsiveWidth(3.6),
    alignItems: "center",
  },
  filterButton: {
    width: getResponsiveWidth(20),
    paddingVertical: getResponsiveHeight(1.5),
    borderRadius: getResponsiveWidth(100),
  },
});

export default ThemedFilter;