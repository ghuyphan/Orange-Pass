import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView, TouchableHighlight } from '@gorhom/bottom-sheet';
import { ThemedText } from '../ThemedText';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Portal } from 'react-native-paper';
import Ionicons from '@expo/vector-icons/Ionicons';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';

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

const ThemedBottomSheet = forwardRef<BottomSheet, ThemedBottomSheetProps>(
    ({ title,
        description,
        deleteText,
        onDeletePress,
        editText,
        onEditPress 
    },
        ref
    ) => {
        const color = useColorScheme() === 'light' ? Colors.light.background : Colors.dark.background;
        const underlayColor = useColorScheme() === 'light' ? Colors.light.toastBackground : Colors.dark.toastBackground;
        const iconColor = useColorScheme() === 'light' ? Colors.light.text : Colors.dark.text;
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
                            onPress={() => bottomSheetRef.current?.close()}
                        />
                    )}
                >
                    <BottomSheetScrollView scrollEnabled={false} style={styles.container}>
                        {title && <ThemedText style={styles.title}>{title}</ThemedText>}
                        {description && <ThemedText style={styles.description}>{description}</ThemedText>}
                        <View style={styles.contentContainer}>
                            <TouchableWithoutFeedback
                                // underlayColor={underlayColor}
                                onPress={onEditPress}
                                style={styles.touchableHighlight}
                            >
                                <View style={styles.buttonContainer}>
                                    <Ionicons name="create-outline" size={20} color={iconColor} />
                                    <ThemedText type='defaultSemiBold' style={styles.buttonText}>{editText}</ThemedText>
                                </View>
                            </TouchableWithoutFeedback>
                            <TouchableHighlight
                                underlayColor={underlayColor}
                                onPress={onDeletePress}
                                style={styles.touchableHighlight}
                            >
                                <View style={styles.buttonContainer}>
                                    <Ionicons name="trash-outline" size={20} color={iconColor} />
                                    <ThemedText type='defaultSemiBold' style={styles.buttonText}>{deleteText}</ThemedText>
                                </View>
                            </TouchableHighlight>
                        </View>
                    </BottomSheetScrollView>
                </BottomSheet>
            </Portal>
        );
    }
);

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
        paddingVertical: 5,
        
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
        // paddingHorizontal: 15,
    },
    buttonText: {
        fontSize: 18,
    },
});

export default ThemedBottomSheet;
