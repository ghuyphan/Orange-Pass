// --- Define Colors Object with distinct border colors ---
const tintColorLight = "#FF7B50";
const tintColorDark = "#FFA726";

export const Colors = {
  light: {
    text: "#4D4239", // A slightly deeper, modern neutral brown
    background: "#FFFDF9", // A warm off-white for a clean look
    tint: tintColorLight,
    icon: "#7A5848", // A refined tone for icons
    inputBackground: "#F9EFE7", // A gentle, modern update to the input field BG
    placeHolder: "#9E9E9E", // Keeps the neutral appearance for placeholders
    tabIconDefault: "#C5C5C5", // A crisp modern gray
    tabIconSelected: tintColorLight,
    error: "#F26A66", // Updated error red with a contemporary feel
    toastBackground: "#E8DBD0", // Light, airy background for temporary messages
    buttonBackground: "#E6DCD1", // A subtle neutral that pairs well with modern designs
    buttonHighlight: "#FFEAA8", // A lighter touch for button highlights
    cardBackground: "#F9EFE7", // Consistent with other light elements
    cardFooter: "#EDE3DA", // A soft accent for card footers
    logoIcon: "#FF7F60", // Keeps the warmth with a slight modern adjustment
    border: "#D1C7BF" // Distinct border color for light mode
  },
  dark: {
    text: "#FFFFFF",
    background: "#121212",
    tint: tintColorDark,
    icon: "#FFFFFF",
    inputBackground: "#2D272B", // Refined dark variant for input backgrounds
    placeHolder: "#757575",
    tabIconDefault: "#757575",
    tabIconSelected: tintColorDark,
    error: "#FF6E6B", // A modern twist on the error tone for dark mode
    toastBackground: "#3F3836", // A deeper, elegant toast background
    buttonBackground: "#3A2E2F", // Darker and more saturated button background for a modern look
    buttonHighlight: "#8A695F", // More vibrant and saturated button highlight color
    cardBackground: "#2D272B", // Harmonized with the input background
    cardFooter: "#1F1A1B", // A slightly darker footer for depth
    logoIcon: tintColorDark, // Keeping the logo consistent with the tint color
    border: "#555555" // Distinct, lighter border color for dark mode
  },
};