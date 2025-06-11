import React, { forwardRef } from "react";
import { Text, type TextProps, StyleSheet } from "react-native";

import { useThemeColor } from "@/hooks/useThemeColor";

// --- Configuration for the Glass Text Effect ---
// This provides a consistent color and shadow for all glass text.
const GLASS_TEXT_CONFIG = {
  color: "rgba(255, 255, 255, 0.95)",
  shadow: {
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
};

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: "default" | "title" | "defaultSemiBold" | "subtitle" | "link";
  variant?: "default" | "glass"; // New prop for the glass style
};

export const ThemedText = forwardRef<Text, ThemedTextProps>(
  (
    {
      style,
      lightColor,
      darkColor,
      type = "default",
      variant = "default", // Default to standard text
      ...rest
    },
    ref
  ) => {
    const themedColor = useThemeColor(
      { light: lightColor, dark: darkColor },
      "text"
    );

    // Determine the final color and style based on the variant
    const isGlass = variant === "glass";
    const finalColor = isGlass ? GLASS_TEXT_CONFIG.color : themedColor;
    const glassStyle = isGlass ? GLASS_TEXT_CONFIG.shadow : undefined;

    return (
      <Text
        ref={ref}
        style={[
          { color: finalColor },
          type === "default" ? styles.default : undefined,
          type === "title" ? styles.title : undefined,
          type === "defaultSemiBold" ? styles.defaultSemiBold : undefined,
          type === "subtitle" ? styles.subtitle : undefined,
          type === "link" ? styles.link : undefined,
          glassStyle, // Apply the glass shadow effect if the variant is 'glass'
          style, // User-provided styles come last to allow overrides
        ]}
        {...rest}
      />
    );
  }
);

ThemedText.displayName = "ThemedText";

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "Roboto-Regular",
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "Roboto-Medium",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    lineHeight: 32,
    fontFamily: "Roboto-Bold",
  },
  subtitle: {
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "Roboto-Bold",
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: "#0a7ea4",
    fontFamily: "Roboto-Regular",
  },
});