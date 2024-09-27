import React, { forwardRef, useImperativeHandle, useRef, useMemo, useCallback } from 'react';
import { View, StyleSheet, Switch } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { ThemedText } from '../ThemedText';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Portal } from 'react-native-paper';
interface ThemedSettingSheetProps {
    ref?: React.Ref<BottomSheet>;
    title?: string;
    description?: string;
    snapPoints?: (string | number)[];
    setting1Text?: string;
    setting1Description?: string;
    setting1Value?: boolean;
    onSetting1Press?: () => void;
    setting2Text?: string;
    setting2Description?: string;
    setting2Value?: boolean;
    onSetting2Press?: () => void;
    setting3Text?: string;
    setting3Description?: string;
    setting3Value?: boolean;
    onSetting3Press?: () => void;
}

const ThemedSettingSheet = React.memo(forwardRef<BottomSheet, ThemedSettingSheetProps>(
    ({
        title,
        description,
        setting1Text,
        setting1Description,
        setting1Value,
        onSetting1Press,
        setting2Text,
        setting2Description,
        setting2Value,
        onSetting2Press,
        setting3Text,
        setting3Description,
        setting3Value,
        onSetting3Press
    }, ref) => {
        const colorScheme = useColorScheme();
        const color = useMemo(() => (colorScheme === 'light' ? Colors.light.background : Colors.dark.background), [colorScheme]);
        const switchColor = useMemo(() => (colorScheme === 'light' ? Colors.light.buttonBackground : Colors.dark.buttonBackground), [colorScheme]);

        const bottomSheetRef = useRef<BottomSheet>(null);

        // Expose BottomSheet methods to parent component via ref
        useImperativeHandle(ref, () => ({
            expand: () => bottomSheetRef.current?.expand(),
            collapse: () => bottomSheetRef.current?.collapse(),
            close: () => bottomSheetRef.current?.close(),
            snapToIndex: (index: number) => bottomSheetRef.current?.snapToIndex(index),
            snapToPosition: (position: string | number) => bottomSheetRef.current?.snapToPosition(position),
            forceClose: () => bottomSheetRef.current?.forceClose(),
        }));

        // Memoize Backdrop Component
        const renderBackdrop = useCallback((props: BottomSheetBackdropProps) => (
            <BottomSheetBackdrop
                {...props}
                opacity={0.5}
                appearsOnIndex={0}
                disappearsOnIndex={-1}
                style={styles.backdrop}
                onPress={() => bottomSheetRef.current?.close()}
            />
        ), []);

        return (
            <Portal>
                <BottomSheet
                    ref={bottomSheetRef}
                    index={-1}
                    backgroundStyle={[styles.background, { backgroundColor: color }]}
                    handleStyle={{
                        backgroundColor: color,
                        borderTopLeftRadius: 50,
                        borderTopRightRadius: 50,
                    }}
                    handleIndicatorStyle={styles.handleIndicator}
                    enablePanDownToClose={true}
                    enableDynamicSizing={true}
                    backdropComponent={renderBackdrop}
                >
                    <BottomSheetScrollView scrollEnabled={false} style={styles.container}>
                        {title && <ThemedText style={styles.title}>{title}</ThemedText>}
                        {description && <ThemedText style={styles.description}>{description}</ThemedText>}
                        <View style={styles.contentContainer}>
                            {setting1Text && (
                                <View style={styles.touchableHighlight}>
                                    <View style={styles.buttonContainer}>
                                        <View style={styles.iconContainer}>
                                            <ThemedText type='defaultSemiBold' style={styles.title}>{setting1Text}</ThemedText>
                                            <ThemedText style={styles.description}>{setting1Description}</ThemedText>
                                        </View>
                                        <Switch
                                            thumbColor={'#fff'}
                                            trackColor={{ false: '#aaa', true: switchColor }}
                                            ios_backgroundColor={color}
                                            value={setting1Value}
                                            onValueChange={onSetting1Press}
                                        />
                                    </View>
                                </View>
                            )}
                            {setting2Text && (
                                <View style={styles.buttonContainer}>
                                    <View style={styles.iconContainer}>
                                        <ThemedText type='defaultSemiBold' style={styles.title}>{setting2Text}</ThemedText>
                                        <ThemedText style={styles.description}>{setting2Description}</ThemedText>
                                    </View>
                                    <Switch
                                        thumbColor={'#fff'}
                                        trackColor={{ false: '#aaa', true: switchColor }}
                                        ios_backgroundColor={color}
                                        value={setting2Value}
                                        onValueChange={onSetting2Press}
                                    />
                                </View>
                            )}
                            {setting3Text && (
                                <View style={styles.buttonContainer}>
                                    <View style={styles.iconContainer}>
                                        <ThemedText type='defaultSemiBold' style={styles.title}>{setting3Text}</ThemedText>
                                        <ThemedText style={styles.description}>{setting3Description}</ThemedText>
                                    </View>
                                    <Switch
                                        thumbColor={'#fff'}
                                        trackColor={{ false: '#aaa', true: switchColor }}
                                        ios_backgroundColor={color}
                                        value={setting3Value}
                                        onValueChange={onSetting3Press}
                                    />
                                </View>
                            )}
                        </View>
                    </BottomSheetScrollView>
                </BottomSheet>
            </Portal>
        );
    }
));

const styles = StyleSheet.create({
    background: {
        backgroundColor: 'white', // This will be overridden by theme color
    },
    handleIndicator: {
        backgroundColor: 'gray', // Customize the handle indicator color
    },
    backdrop: {
        backgroundColor: 'black', // Darken the backdrop
    },
    container: {
        paddingHorizontal: 15,
    },
    contentContainer: {
        flexDirection: 'column',
        marginBottom: 15,
        borderRadius: 10,
        paddingVertical: 5,
        paddingHorizontal: 10,
    },
    touchableHighlight: {
        borderRadius: 10, // Ensures the highlight covers the entire button, including rounded corners
        marginVertical: 5, // Adds spacing between buttons
    },
    buttonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        justifyContent: 'space-between',
    },
    title: {
        fontSize: 18,
    },
    description: {
        fontSize: 14,
        maxWidth: 280,
        overflow: 'hidden',
        lineHeight: 20,
        opacity: 0.7,
    },
    iconContainer: {
        flexDirection: 'column',
    }
});

export default ThemedSettingSheet;
