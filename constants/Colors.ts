const tintColorLight = '#FFC482'; // Warm, light accent color
const tintColorDark = '#D8A657';  // Darker, but same hue as light tint

export const Colors = {
  light: {
    text: '#000000', // Warm dark brown
    background: '#FFF5E1', // Very light warm beige
    tint: tintColorLight,
    icon: '#D3B8A3', // Warm light brown
    inputBackground: '#ffe7d2', // Light beige
    placeHolder: '#00000080', // Semi-transparent version of text color
    tabIconDefault: '#C19A7C', // Warm medium brown
    tabIconSelected: tintColorLight,
    error: '#D9534F', // Standard bootstrap red for better cross-theme consistency
    toastBackground: '#D3B8A3', // Matches icon color
    buttonBackground: '#D3B8A3', // Matches icon and toast background
    buttonHighlight: '#EAC9B8', // Lighter shade for highlight
    cardBackground: '#ffe7d2', // Light warm beige
    cardFooter: '#e6d1be', // Slightly darker than card background
    logoIcon: '#D3B8A3', // Matches icon color
  },
  dark: {
    text: '#FFFFFF', // Light warm beige for contrast on dark background
    background: '#1F1B16', // Very dark warm brown, matches hue of light background
    tint: tintColorDark,
    icon: '#8A5C42', // Darker brown, same hue as light icon
    inputBackground: '#3E352E', // Dark warm brown, matches hue of light input background
    placeHolder: '#FFFFFF80', // Semi-transparent version of text color
    tabIconDefault: '#8F6E46', // Darker brown, same hue as light tab icon default
    tabIconSelected: tintColorDark,
    error: '#D9534F', // Same as light mode for consistency
    toastBackground: '#5A3D30', // Darker warm brown, matches dark icon color
    buttonBackground: '#5A3D30', // Matches toast background
    buttonHighlight: '#7B5A48', // Slightly lighter for highlight
    cardBackground: '#3E352E', // Dark warm brown, matches hue of light card background
    cardFooter: '#695144', // Slightly lighter than card background
    logoIcon: '#8A5C42', // Matches dark icon color
  },
};
