const tintColorLight = '#FFC482'; // Warm, light accent color
const tintColorDark = '#D8A657';  // Darker, warmer accent color matching light tint

export const Colors = {
  light: {
    text: '#000000', // Warm dark brown for softer contrast
    background: '#FFF5E1', // Very light warm beige
    tint: tintColorLight,
    icon: '#D3B8A3', // Warm light brown
    inputBackground: '#FFE7D2', // Light beige
    placeHolder: '#2E2A2680', // Semi-transparent warm dark
    tabIconDefault: '#C19A7C', // Warm medium brown
    tabIconSelected: tintColorLight,
    error: '#D9534F', // Consistent red for visibility
    toastBackground: '#D3B8A3', // Matches icon color
    buttonBackground: '#D3B8A3', // Matches icon and toast background
    buttonHighlight: '#EAC9B8', // Lighter shade for highlight
    cardBackground: '#FFE7D2', // Light warm beige
    cardFooter: '#E6D1BE', // Slightly darker than card background
    logoIcon: '#D3B8A3', // Matches icon color
  },
  dark: {
    text: '#FFFFFF', // Warm light beige for contrast
    background: '#2A2521', // Dark neutral brown-gray, less brown than original
    tint: tintColorDark,
    icon: '#B29072', // Muted warm taupe, softer than intense brown
    inputBackground: '#403732', // Dark warm gray, similar to light mode hue
    placeHolder: '#F4ECE780', // Semi-transparent warm light
    tabIconDefault: '#A17B5D', // Warm taupe for a balanced tone
    tabIconSelected: tintColorDark,
    error: '#D9534F', // Consistent error color across themes
    toastBackground: '#4C413A', // Darker warm gray, less saturated
    buttonBackground: '#6B5A4E', // Consistent with toast background
    buttonHighlight: '#70584A', // Softer, warmer highlight
    cardBackground: '#403732', // Dark warm gray to match light card background
    cardFooter: '#5C4D43', // Slightly lighter for subtle contrast
    logoIcon: '#B29072', // Consistent with dark icon color
  },
};
