// --- Define Colors Object with glassmorphism support ---
const tintColorLight = "#FF7B50";
const tintColorDark = "#FFA726"; // Restoring the original dark tint

export const Colors = {
  light: {
    text: "#4D4239",              // A slightly deeper, modern neutral brown
    background: "#FFFDF9",        // A warm off-white for a clean look
    tint: tintColorLight,
    icon: "#7A5848",              // A refined tone for icons
    inputBackground: "rgba(249, 239, 231, 0.8)",  // Semi-transparent version of your original
    placeHolder: "#9E9E9E",       // Keeps the neutral appearance for placeholders
    tabIconDefault: "#C5C5C5",    // A crisp modern gray
    tabIconSelected: tintColorLight,
    error: "#F26A66",             // Updated error red with a contemporary feel
    toastBackground: "rgba(232, 219, 208, 0.9)",  // Semi-transparent version
    buttonBackground: "rgba(230, 220, 209, 0.7)", // Glass version of your button
    buttonHighlight: "rgba(255, 234, 168, 0.8)",  // Semi-transparent highlight
    cardBackground: "rgba(249, 239, 231, 0.6)",   // Glass version of your card
    cardFooter: "rgba(237, 227, 218, 0.8)",       // Semi-transparent footer
    logoIcon: "#FF7F60",          // Keeps the warmth with a slight modern adjustment
    border: "rgba(209, 199, 191, 0.7)",           // Semi-transparent border
  },
  dark: {
    // Reverted to the original dark theme colors
    text: "#FFFFFF",
    background: "#121212",
    tint: tintColorDark,
    icon: "#FFFFFF",
    inputBackground: "rgba(45, 39, 43, 0.8)",     // Semi-transparent version
    placeHolder: "#757575",
    tabIconDefault: "#757575",
    tabIconSelected: tintColorDark,
    error: "#FF6E6B",             // A modern twist on the error tone for dark mode
    toastBackground: "rgba(63, 56, 54, 0.9)",     // Semi-transparent version
    buttonBackground: "rgba(58, 46, 47, 0.7)",    // Glass version of your dark button
    buttonHighlight: "rgba(138, 105, 95, 0.8)",   // Semi-transparent highlight
    cardBackground: "rgba(45, 39, 43, 0.6)",      // Glass version of your card
    cardFooter: "rgba(31, 26, 27, 0.9)",          // Semi-transparent footer
    logoIcon: tintColorDark,      // Keeping the logo consistent with the tint color
    border: "rgba(85, 85, 85, 0.7)",              // Semi-transparent border
  },
};