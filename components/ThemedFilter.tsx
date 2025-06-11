import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  FlatList,
  StyleProp,
  ViewStyle,
  StyleSheet,
  View,
  Pressable,
  Dimensions,
} from "react-native";
import { t } from "@/i18n";
import { useLocale } from "@/context/LocaleContext";
import { useTheme } from "@/context/ThemeContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import {
  getResponsiveFontSize,
  getResponsiveWidth,
  getResponsiveHeight,
} from "@/utils/responsive";
import { useGlassStyle } from "@/hooks/useGlassStyle";

type ThemedFilterProps = {
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
  style?: StyleProp<ViewStyle>;
};

interface FilterItemType {
  key: string;
  label: string;
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
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
    const { overlayColor, borderColor } = useGlassStyle(); // Use the hook
    const buttonWidth = getResponsiveWidth(20);
    const iconSize = getResponsiveFontSize(20);

    const iconColor = useMemo(() => {
      if (isSelected) {
        // Selected: High contrast icon color against the solid background
        return isDarkMode
          ? Colors.dark.buttonBackground // Dark icon on white background
          : Colors.light.buttonBackground; // White icon on dark background
      }
      // Unselected: Standard theme icon color
      return isDarkMode ? Colors.dark.icon : Colors.light.icon;
    }, [isSelected, isDarkMode]);

    return (
      <Pressable
        onPress={() => handlePress(item.key)}
        style={[
          styles.filterButton,
          { width: buttonWidth },
          // Apply background color first
          isSelected
            ? isDarkMode
              ? styles.selectedButtonDarkMode
              : styles.selectedButtonLightMode
            : isDarkMode
            ? styles.buttonBackgroundDarkMode
            : styles.buttonBackgroundLightMode,
          // Apply the glass-like border ONLY if unselected
          !isSelected && [styles.unselectedButton, { borderColor: borderColor }],
        ]}
      >
        {/* The glass-like overlay is added only when the button is NOT selected */}
        {!isSelected && <View style={[styles.defaultOverlay, {backgroundColor: overlayColor}]} />}

        <View style={styles.iconView}>
          <MaterialCommunityIcons
            name={item.iconName}
            size={iconSize}
            color={iconColor}
            style={{ opacity: isSelected ? 1 : 0.8 }} // Slightly fade unselected icons
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

FilterItem.displayName = "FilterItem";

const ThemedFilter = ({
  selectedFilter,
  onFilterChange,
  style,
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
    />
  );
};

const styles = StyleSheet.create({
  filterContainer: {
    paddingHorizontal: getResponsiveWidth(3.6),
    alignItems: "center",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: getResponsiveHeight(1.5),
    borderRadius: getResponsiveWidth(4),
    overflow: "hidden", // Important for the overlay's rounded corners
  },
  // --- Button State Styles ---
  selectedButtonLightMode: {
    backgroundColor: Colors.light.icon, // Solid dark color
  },
  selectedButtonDarkMode: {
    backgroundColor: Colors.dark.icon, // Solid light color
  },
  buttonBackgroundDarkMode: {
    backgroundColor: Colors.dark.buttonBackground,
  },
  buttonBackgroundLightMode: {
    backgroundColor: Colors.light.buttonBackground,
  },
  unselectedButton: {
    // This adds the border for the glass-like effect
    borderWidth: 1,
    // borderColor: DEFAULT_OVERLAY_CONFIG.borderColor,
  },
  // --- Overlay for the glass-like effect on unselected buttons ---
  defaultOverlay: {
    ...StyleSheet.absoluteFillObject,
    // backgroundColor: DEFAULT_OVERLAY_CONFIG.overlayColor,
    borderRadius: getResponsiveWidth(4),
  },
  iconView: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: getResponsiveWidth(3.6),
    // zIndex ensures the icon is rendered on top of the overlay
    zIndex: 1,
  },
});

export default ThemedFilter;