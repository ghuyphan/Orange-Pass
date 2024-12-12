import React, { forwardRef, useImperativeHandle, useRef, ReactNode } from 'react';
import { View, StyleSheet, Pressable, ViewStyle, TextStyle } from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetProps, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { ThemedText } from '../ThemedText';
import { Colors } from '@/constants/Colors';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

export interface BottomSheetAction {
    icon?: React.ComponentProps<typeof MaterialCommunityIcons | typeof MaterialIcons>['name'];
    iconLibrary?: 'MaterialCommunityIcons' | 'MaterialIcons';
    text: string;
    onPress: () => void;
    disabled?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

interface ReuseableSheetProps extends Partial<BottomSheetProps> {
    ref?: React.Ref<BottomSheet>;
    title?: string;
    description?: string;
    actions?: BottomSheetAction[];
    customContent?: ReactNode;
    customHeader?: ReactNode;
    customFooter?: ReactNode;
    styles?: {
        container?: ViewStyle;
        title?: TextStyle;
        description?: TextStyle;
        header?: ViewStyle;
        footer?: ViewStyle;
    };
    scrollable?: boolean;
    closeOnBackdropPress?: boolean;
    dynamicSnapPoints?: boolean;
    minHeight?: string | number;
    maxHeight?: string | number;
}

const ThemedReuseableSheet = forwardRef<BottomSheet, ReuseableSheetProps>(
    ({
        title,
        description,
        actions,
        customContent,
        customHeader,
        customFooter,
        styles: customStyles = {},
        scrollable = true,
        closeOnBackdropPress = true,
        snapPoints = ['50%', '90%'],
        dynamicSnapPoints = false,
        minHeight = '30%',
        maxHeight = '90%',
        ...bottomSheetProps
    }, ref) => {
        const { currentTheme } = useTheme();
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

        const renderIcon = (action: BottomSheetAction) => {
            const iconColor = currentTheme === 'light' ? Colors.light.text : Colors.dark.text;
            const iconSize = 18;

            if (action.iconLibrary === 'MaterialIcons' || !action.iconLibrary) {
                return (
                    <MaterialIcons
                        name={action.icon as React.ComponentProps<typeof MaterialIcons>['name']}
                        size={iconSize}
                        color={iconColor}
                    />
                );
            }

            return (
                <MaterialCommunityIcons
                    name={action.icon as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
                    size={iconSize}
                    color={iconColor}
                />
            );
        };

        // Determine snap points
        const resolvedSnapPoints = dynamicSnapPoints
            ? [minHeight, maxHeight]
            : snapPoints;

        // Render content based on scrollable prop
        const ContentWrapper = scrollable ? BottomSheetScrollView : View;

        return (
            <BottomSheet
                ref={bottomSheetRef}
                index={-1}
                snapPoints={resolvedSnapPoints}
                animateOnMount={true}
                backgroundStyle={[
                    styles.background,
                    {
                        backgroundColor: currentTheme === 'light'
                            ? Colors.light.cardBackground
                            : Colors.dark.cardBackground
                    },
                    customStyles.container
                ]}
                handleStyle={[
                    styles.handle,
                    {
                        backgroundColor: currentTheme === 'light'
                            ? Colors.light.cardBackground
                            : Colors.dark.cardBackground,
                    },
                    customStyles.header
                ]}
                handleIndicatorStyle={styles.handleIndicator}
                enablePanDownToClose={true}
                backdropComponent={(props) => (
                    <BottomSheetBackdrop
                        {...props}
                        opacity={0.7}
                        appearsOnIndex={0}
                        disappearsOnIndex={-1}
                        onPress={closeOnBackdropPress ? () => bottomSheetRef.current?.close() : undefined}
                    />
                )}
                {...bottomSheetProps}
            >
                <ContentWrapper contentContainerStyle={[styles.contentContainer, customStyles.container]}>
                    {/* Custom Header */}
                    {customHeader}

                    {/* Default Header Content */}
                    {(title || description) && (
                        <View style={styles.headerContent}>
                            {title && (
                                <ThemedText
                                    style={[
                                        styles.title,
                                        customStyles.title
                                    ]}
                                >
                                    {title}
                                </ThemedText>
                            )}
                            {description && (
                                <ThemedText
                                    style={[
                                        styles.description,
                                        customStyles.description
                                    ]}
                                >
                                    {description}
                                </ThemedText>
                            )}
                        </View>
                    )}

                    {/* Main Content */}
                    {customContent}

                    {/* Action Buttons */}
                    {actions && (
                        <View style={styles.buttonsContainer}>
                            {actions.map((action, index) => (
                                <Pressable
                                    key={index}
                                    onPress={action.onPress}
                                    disabled={action.disabled}
                                    style={[
                                        styles.button,
                                        action.style,
                                        action.disabled && styles.disabledButton
                                    ]}
                                    android_ripple={{
                                        color: currentTheme === 'light'
                                            ? 'rgba(0, 0, 0, 0.2)'
                                            : 'rgba(255, 255, 255, 0.2)',
                                        foreground: true,
                                        borderless: false
                                    }}
                                >
                                    {action.icon && renderIcon(action)}
                                    <ThemedText
                                        style={[
                                            styles.buttonText,
                                            action.textStyle,
                                            action.disabled && styles.disabledButtonText
                                        ]}
                                    >
                                        {action.text}
                                    </ThemedText>
                                </Pressable>
                            ))}
                        </View>
                    )}

                    {/* Custom Footer */}
                    {customFooter}
                </ContentWrapper>
            </BottomSheet>
        )
    }
);

ThemedReuseableSheet.displayName = 'ThemedReuseableSheet';

const styles = StyleSheet.create({
    background: {
        backgroundColor: 'white',
    },
    handle: {
        borderTopLeftRadius: 50,
        borderTopRightRadius: 50,
    },
    handleIndicator: {
        backgroundColor: 'gray',
    },
    contentContainer: {
        // padding: 10,
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    headerContent: {
        // marginBottom: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        // marginBottom: 8,
    },
    description: {
        fontSize: 14,
        color: 'gray',
        textAlign: 'center',
    },
    buttonsContainer: {
        flexDirection: 'column',
        gap: 5,
        marginTop: 16,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 16,
        overflow: 'hidden',
    },
    buttonText: {
        fontSize: 16,
    },
    disabledButton: {
        opacity: 0.5,
    },
    disabledButtonText: {
        color: 'gray',
    },
});

export default ThemedReuseableSheet;