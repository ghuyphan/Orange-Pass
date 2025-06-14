import { useMemo } from "react";
import { useTheme } from "@/context/ThemeContext";
import { Colors } from "@/constants/Colors";

// Central, theme-aware configuration for glass-like effects
const GLASS_STYLE_CONFIG = {
  light: {
    // Subtle glass effect (original)
    subtle: {
      overlayColor: "rgba(0, 0, 0, 0.01)",
      borderColor: "rgba(0, 0, 0, 0.08)",
      background: "rgba(255, 255, 255, 0.05)",
    },
    // Medium glass effect
    medium: {
      overlayColor: Colors.light.inputBackground,
      borderColor: "rgba(255, 255, 255, 0.8)",
      background: "rgba(255, 255, 255, 0.7)",
      shadow: {
        shadowColor: "rgb(0, 0, 0)",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      },
    },
    // Strong glass effect (like the glass variant)
    strong: {
      overlayColor: "rgba(255, 255, 255, 0.2)",
      borderColor: "rgba(255, 255, 255, 0.4)",
      background: "rgba(255, 255, 255, 0.1)",
      shadow: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    },
  },
  dark: {
    // Subtle glass effect (original)
    subtle: {
      overlayColor: "rgba(255, 255, 255, 0.05)",
      borderColor: "rgba(255, 255, 255, 0.15)",
      background: "rgba(255, 255, 255, 0.02)",
    },
    // Medium glass effect
    medium: {
      overlayColor: Colors.dark.inputBackground,
      borderColor: "rgba(255, 255, 255, 0.25)",
      background: "rgba(255, 255, 255, 0.15)",
      shadow: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
      },
    },
    // Strong glass effect (like the glass variant)
    strong: {
      overlayColor: "rgba(255, 255, 255, 0.1)",
      borderColor: "rgba(255, 255, 255, 0.2)",
      background: "rgba(255, 255, 255, 0.15)",
      shadow: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    },
  },
};

export type GlassIntensity = "subtle" | "medium" | "strong";

/**
 * A custom hook that provides theme-aware styles for glass-like effects.
 * It returns the appropriate styling based on the current theme and intensity level.
 * 
 * @param intensity - The intensity of the glass effect ("subtle" | "medium" | "strong")
 * @returns Glass styling object with overlayColor, borderColor, background, and optionally shadow
 */
export const useGlassStyle = (intensity: GlassIntensity = "subtle") => {
  const { currentTheme } = useTheme();

  const glassStyle = useMemo(() => {
    return GLASS_STYLE_CONFIG[currentTheme][intensity];
  }, [currentTheme, intensity]);

  // For backward compatibility, also return the individual properties
  const { overlayColor, borderColor, background, shadow } = glassStyle as {
    overlayColor: string;
    borderColor: string;
    background: string;
    shadow?: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
  };

  return {
    // Individual properties (backward compatible)
    overlayColor,
    borderColor,
    background,
    shadow,
    // Complete style object
    glassStyle,
    // Helper methods for common use cases
    getGlassBackground: () => background,
    getGlassBorder: () => ({ borderColor, borderWidth: 1 }),
    getGlassOverlay: () => ({ backgroundColor: overlayColor }),
    getGlassShadow: () => shadow || {},
  };
};

/**
 * Convenience hook for getting all available glass intensities for the current theme
 * Useful when you need to switch between different intensities dynamically
 */
export const useAllGlassStyles = () => {
  const { currentTheme } = useTheme();

  return useMemo(() => {
    return GLASS_STYLE_CONFIG[currentTheme];
  }, [currentTheme]);
};