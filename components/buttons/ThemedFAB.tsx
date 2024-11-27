import * as React from 'react';
import { FAB, Portal, Provider as PaperProvider } from 'react-native-paper';
import { StyleProp, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';

export type ThemedFABProps = {
    lightColor?: string;
    darkColor?: string;
    label?: string;
    open?: boolean;
    iconName?: keyof typeof MaterialIcons.glyphMap;
    style?: StyleProp<ViewStyle>;
    onPress1: () => void
    onPress2: () => void
};

export function ThemedFAB({
    lightColor,
    darkColor,
    label,
    iconName,
    style,
    onPress1,
    onPress2
}: ThemedFABProps) {
    const { currentTheme } = useTheme();
    const icon  = currentTheme === 'light' ? Colors.light.text : Colors.dark.text;
    const button = currentTheme === 'light' ? Colors.light.buttonBackground : Colors.dark.buttonBackground;
    const [state, setState] = React.useState({ open: false });

    const onStateChange = ({ open }: { open: boolean }) => setState({ open });

    const { open } = state;

    return (
            <FAB.Group
                // backdropColor='transparent'
                backdropColor='transparent'
                fabStyle={[style, { backgroundColor: button }]}
                color={icon}
                open={open}
                visible
                icon={open ? 'close' : 'plus'}
                actions={[
                    {
                        icon: 'qrcode-scan',
                        color: icon,
                        style: { backgroundColor: button },
                        onPress: onPress1,
                    },
                    {
                        icon: 'plus-circle-outline',
                        color: icon,
                        style: { backgroundColor: button },
                        onPress: onPress2,
                    },
                ]}
                onStateChange={onStateChange}
                onPress={() => {
                    if (open) {
                        // do something if the speed dial is open
                    }
                }}
            />
    );
}