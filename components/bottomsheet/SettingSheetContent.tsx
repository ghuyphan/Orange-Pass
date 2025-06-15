import React from "react";
import {
  View,
  StyleSheet,
  Pressable,
  StyleProp,
  ViewStyle,
} from "react-native";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/context/ThemeContext";
import { Colors } from "@/constants/Colors";
import {
  getResponsiveFontSize,
  getResponsiveHeight,
  getResponsiveWidth,
} from "@/utils/responsive";
import { t } from "@/i18n";
import { useGlassStyle } from "@/hooks/useGlassStyle";

interface SettingSheetContentProps {
  style?: StyleProp<ViewStyle>;
  onDelete: () => void;
  onEdit: () => void;
}

const SettingSheetContent: React.FC<SettingSheetContentProps> = ({
  style,
  onDelete,
  onEdit,
}) => {
  const { currentTheme } = useTheme();
  const { overlayColor, borderColor } = useGlassStyle();

  const iconColor =
    currentTheme === "light" ? Colors.light.icon : Colors.dark.icon;
  const cardBackgroundColor = currentTheme === "dark" ? Colors.dark.cardBackground : Colors.light.cardBackground;

  const renderIcon = (
    iconName: React.ComponentProps<typeof MaterialCommunityIcons>["name"],
  ) => {
    return (
      <MaterialCommunityIcons
        name={iconName}
        size={getResponsiveFontSize(18)}
        color={iconColor}
      />
    );
  };

  return (
    <View style={[styles.container, { borderColor }, style]}>
      <View
        style={[styles.defaultOverlay, { backgroundColor: cardBackgroundColor }]}
      />
      <View style={styles.buttonsContainer}>
        <Pressable
          onPress={onEdit}
          style={styles.button}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          {renderIcon("pencil")}
          <ThemedText style={styles.buttonText}>
            {t("homeScreen.edit")}
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={onDelete}
          style={styles.button}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          {renderIcon("delete")}
          <ThemedText style={styles.buttonText}>
            {t("homeScreen.delete")}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    paddingHorizontal: getResponsiveWidth(4.8),
    marginHorizontal: getResponsiveWidth(3.6),
    borderWidth: 1,
    overflow: "hidden",
  },
  defaultOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  buttonsContainer: {
    flexDirection: "column",
    gap: getResponsiveHeight(0.6),
    marginVertical: getResponsiveHeight(1),
    zIndex: 1,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: getResponsiveWidth(2.4),
    paddingVertical: getResponsiveHeight(1.2),
    borderRadius: getResponsiveWidth(4),
    overflow: "hidden",
  },
  buttonText: {
    fontSize: getResponsiveFontSize(16),
  },
});

export default SettingSheetContent;