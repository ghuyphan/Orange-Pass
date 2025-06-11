import { useMemo } from "react";
import { useTheme } from "@/context/ThemeContext";

// Central, theme-aware configuration for the glass-like effect.
const GLASS_STYLE_CONFIG = {
  light: {
    overlayColor: "rgba(0, 0, 0, 0.01)", // Subtle black overlay for light theme
    borderColor: "rgba(0, 0, 0, 0.08)", // Subtle black border for light theme
  },
  dark: {
    overlayColor: "rgba(255, 255, 255, 0.05)", // Subtle white overlay for dark theme
    borderColor: "rgba(255, 255, 255, 0.15)", // Subtle white border for dark theme
  },
};

/**
 * A custom hook that provides theme-aware styles for the "glass-like" effect.
 * It returns the appropriate overlayColor and borderColor based on the current theme.
 * @returns {{ overlayColor: string, borderColor: string }}
 */
export const useGlassStyle = () => {
  const { currentTheme } = useTheme();

  const activeGlassConfig = useMemo(() => {
    return GLASS_STYLE_CONFIG[currentTheme];
  }, [currentTheme]);

  return activeGlassConfig;
};