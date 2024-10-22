const tintColorLight = '#FFC482'; // Warm, light accent color
const tintColorDark = '#D8A657';  // Darker, but same hue as light tint

export const Colors = {
  light: {
    text: '#5A4639', // Warm dark brown
    background: '#FFF5E1', // Very light warm beige
    tint: tintColorLight,
    icon: '#D3B08C', // Warm light brown
    inputBackground: '#FFE4C4', // Light beige
    placeHolder: '#5A463980', // Semi-transparent version of text color
    tabIconDefault: '#C19A7C', // Warm medium brown
    tabIconSelected: tintColorLight,
    error: '#D9534F', // Standard bootstrap red for better cross-theme consistency
    toastBackground: '#D3B08C', // Matches icon color
    buttonBackground: '#D3B08C', // Matches icon and toast background
    buttonHighlight: '#EAC9B8', // Lighter shade for highlight
    cardBackground: '#FFE4C4', // Light warm beige
    cardFooter: '#E2C8A8', // Slightly darker than card background
    logoIcon: '#D3B08C', // Matches icon color
  },
  dark: {
    text: '#FFF5E1', // Light warm beige for contrast on dark background
    background: '#2A241F', // Very dark warm brown, matches hue of light background
    tint: tintColorDark,
    icon: '#8A5C42', // Darker brown, same hue as light icon
    inputBackground: '#3E352E', // Dark warm brown, matches hue of light input background
    placeHolder: '#FFF5E180', // Semi-transparent version of text color
    tabIconDefault: '#8F6E46', // Darker brown, same hue as light tab icon default
    tabIconSelected: tintColorDark,
    error: '#D9534F', // Same as light mode for consistency
    toastBackground: '#5A3D30', // Darker warm brown, matches dark icon color
    buttonBackground: '#5A3D30', // Matches toast background
    buttonHighlight: '#7B5A48', // Slightly lighter for highlight
    cardBackground: '#3E352E', // Dark warm brown, matches hue of light card background
    cardFooter: '#5A4739', // Slightly lighter than card background
    logoIcon: '#8A5C42', // Matches dark icon color
  },
};
