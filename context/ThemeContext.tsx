import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { Appearance, Platform } from "react-native";
import { useMMKVBoolean } from "react-native-mmkv";
import { storage } from "@/utils/storage";
import * as NavigationBar from "expo-navigation-bar";
import { StatusBar } from "expo-status-bar";

type Theme = "light" | "dark";

interface ThemeContextType {
  isDarkMode: boolean | undefined;
  setDarkMode: (value: boolean | undefined) => void;
  useSystemTheme: () => void;
  currentTheme: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isDarkMode, setIsDarkMode] = useMMKVBoolean("dark-mode");
  const [systemTheme, setSystemTheme] = useState<Theme>(
    () => Appearance.getColorScheme() || "light",
  );

  const currentTheme = useMemo((): Theme => {
    if (isDarkMode === undefined) {
      return systemTheme;
    }
    return isDarkMode ? "dark" : "light";
  }, [isDarkMode, systemTheme]);

  // --- CORRECTED EFFECT ---
  // This effect now ONLY controls the button/icon style, not the background.
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const buttonStyle = currentTheme === "dark" ? "light" : "dark";
    try {
      // Only set the button style. The background is handled by edge-to-edge.
      NavigationBar.setButtonStyleAsync(buttonStyle);
    } catch (error) {
      console.error("Error setting navigation bar button style:", error);
    }
  }, [currentTheme]);

  useEffect(() => {
    const updateSystemTheme = () => {
      setSystemTheme(Appearance.getColorScheme() || "light");
    };

    const subscription = Appearance.addChangeListener(updateSystemTheme);
    return () => subscription.remove();
  }, []);

  const themeContextValue = useMemo(
    (): ThemeContextType => ({
      isDarkMode,
      setDarkMode: (value: boolean | undefined) => {
        setIsDarkMode(value);
        if (value !== undefined) {
          storage.set("dark-mode", value);
        } else {
          storage.delete("dark-mode");
        }
      },
      useSystemTheme: () => {
        setIsDarkMode(undefined);
        storage.delete("dark-mode");
      },
      currentTheme,
    }),
    [isDarkMode, currentTheme, setIsDarkMode],
  );

  return (
    <ThemeContext.Provider value={themeContextValue}>
      {/*
        --- CORRECTED STATUS BAR ---
        Removed `backgroundColor` and `translucent` props.
        They are not needed with edgeToEdgeEnabled.
        We only need to control the style (icon color).
      */}
      {/* <StatusBar translucent style={currentTheme === "dark" ? "light" : "dark"} /> */}
      {children}
    </ThemeContext.Provider>
  );
};