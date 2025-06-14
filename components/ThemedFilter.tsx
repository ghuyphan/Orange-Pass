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

  const handlePress = useCallback(
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

  // Use useCallback for FlatList's renderItem for performance
  const renderFilterItem = useCallback(
    ({ item }: { item: FilterItemType }) => {
      const isSelected = selectedFilter === item.key;

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
          onPress={() => handlePress(item.key)}
          iconName={item.iconName}
          // Dynamically set props based on whether the item is selected
          variant={isSelected ? "solid" : variant}
          iconColor={isSelected ? selectedIconColor : unselectedIconColor}
          style={[styles.filterButton, isSelected && selectedStyle]}
          glassIntensity={glassIntensity}
        />
      );
    },
    [selectedFilter, isDarkMode, handlePress, variant, glassIntensity]
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
  // This style is now passed to ThemedButton to define its shape and size
  filterButton: {
    width: getResponsiveWidth(20),
    paddingVertical: getResponsiveHeight(1.5),
    borderRadius: getResponsiveWidth(100),
  },
});

export default ThemedFilter;