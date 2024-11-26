import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView, TouchableHighlight } from '@gorhom/bottom-sheet';
import { ThemedText } from '../ThemedText';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Portal } from 'react-native-paper';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

interface ThemedBottomSheetProps {
    ref?: React.Ref<BottomSheet>;
    title?: string;
    description?: string;
    snapPoints?: (string | number)[];
    editText?: string;
    onEditPress?: () => void;
    deleteText?: string;
    onDeletePress?: () => void;
}

const ThemedBottomSheet = React.memo(forwardRef<BottomSheet, ThemedBottomSheetProps>(
    ({ title,
        description,
        deleteText,
        onDeletePress,
        editText,
        onEditPress 
    },
        ref
    ) => {
        // const colorScheme = useColorScheme();
        const { currentTheme } = useTheme();
        const color = useMemo(() => (currentTheme === 'light' ? Colors.light.background : Colors.dark.background), [currentTheme]);
        const iconColor = useMemo(() => (currentTheme === 'light' ? Colors.light.text : Colors.dark.text), [currentTheme]);
        const rippleColor = useMemo(() => (currentTheme === 'light' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'), [currentTheme]);
        // const color = useColorScheme() === 'light' ? Colors.light.background : Colors.dark.background;
        // const iconColor = useColorScheme() === 'light' ? Colors.light.text : Colors.dark.text;
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

        return (
            <Portal>
                <BottomSheet
                    ref={bottomSheetRef}
                    index={-1}
                    animateOnMount={true}
                    backgroundStyle={[styles.background, { backgroundColor: color }]}
                    handleStyle={{
                        backgroundColor: color,
                        borderTopLeftRadius: 50,
                        borderTopRightRadius: 50,
                    }}
                    handleIndicatorStyle={styles.handleIndicator}
                    enablePanDownToClose={true}
                    enableDynamicSizing={true}
                    backdropComponent={(props) => (
                        <BottomSheetBackdrop
                            {...props}
                            opacity={0.5}
                            appearsOnIndex={0}
                            disappearsOnIndex={-1}
                            style={styles.backdrop}
                            onPress={() => bottomSheetRef.current?.snapToIndex(-1)}
                        />
                    )}
                >
                    <BottomSheetScrollView scrollEnabled={false} style={styles.container}>
                        {title && <ThemedText style={styles.title}>{title}</ThemedText>}
                        {description && <ThemedText style={styles.description}>{description}</ThemedText>}
                        <View style={styles.contentContainer}>
                            <Pressable
                                // underlayColor={underlayColor}
                                onPress={onEditPress}
                                style={styles.buttonContainer}
                                android_ripple={{color: rippleColor, foreground: true, borderless: false }}
                            >
                                    <MaterialCommunityIcons name="pencil-outline" size={18} color={iconColor} />
                                    <ThemedText style={styles.buttonText}>{editText}</ThemedText>
                            </Pressable>
                            <Pressable
                                // underlayColor={underlayColor}
                                onPress={onDeletePress}
                                style={styles.buttonContainer}
                                android_ripple={{ color: rippleColor, foreground: true, borderless: false }}
                            >

                                    <MaterialIcons name="delete-outline" size={18} color={iconColor} />
                                    <ThemedText style={styles.buttonText}>{deleteText}</ThemedText>
                            </Pressable>
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
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    description: {
        fontSize: 14,
        color: 'gray',
        marginBottom: 16,
    },
    contentContainer: {
        flexDirection: 'column',
        marginBottom: 15,
        borderRadius: 10,
        gap: 5,
    },
    touchableHighlight: {
        borderRadius: 10, // Ensures the highlight covers the entire button, including rounded corners
    },
    buttonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 25,
        overflow: 'hidden',
        // borderRadius: 10,
        // marginVertical: 5,
    },
    buttonText: {
        fontSize: 16,
    },
});

export default ThemedBottomSheet;
