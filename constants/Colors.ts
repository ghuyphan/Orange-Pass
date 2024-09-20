/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#FFC482'; // Complementary color to #FFF5E1
const tintColorDark = '#D8A657';  // Harmonious color to #FFF5E1

export const Colors = {
  light: {
    text: '#5A4639', // Darker shade to match the light theme
    background: '#FFF5E1',
    tint: tintColorLight,
    icon: '#D3B08C', // Another complementary color
    inputBackground: '#FFE4C4',
    placeHolder: '#5A46394D',
    tabIconDefault: '#C19A7C',
    tabIconSelected: tintColorLight,
    error: '#D32F2F', // Red color for errors
    toastBackground: '#D3B08C',
    buttonBackground: '#D3B08C',
    buttonHighlight: '#EAC9B8',
    cardBackground: '#FFE4C4',
    cardFooter: '#DBC3AC',
    logoIcon: '#FFE4C4',
  },
  dark: {
    text: '#FFF5E1', // Use the same background color for text in dark mode for contrast
    background: '#2D2524', // Adjusted background color to complement light mode and logo color
    tint: tintColorDark,
    icon: '#8A5C42', // Another harmonious color
    inputBackground: '#503f3c', // Adjusted input background color to complement light mode and logo color
    placeHolder: '#FFF5E14D',
    tabIconDefault: '#8F6E46',
    tabIconSelected: tintColorDark,
    error: '#fc6862',
    toastBackground: '#5A3D38',
    buttonBackground: '#7B524A', // Darker but complementary shade for button background
    buttonHighlight: '#62443E',
    cardBackground: '#503f3c',
    cardFooter: '#7B615E',
    logoIcon: '#503f3c'
  },
};
