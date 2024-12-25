import React, { forwardRef, useImperativeHandle, useRef, ReactNode, useCallback } from 'react';
import { View, StyleSheet, Pressable, ViewStyle, TextStyle } from 'react-native';
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetFlatList,
  BottomSheetProps,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { ThemedText } from '../ThemedText';
import { Colors } from '@/constants/Colors';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';

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
  contentType?: 'scroll' | 'flat' | 'custom';
  contentProps?: {
    scrollViewProps?: React.ComponentProps<typeof BottomSheetScrollView>;
    flatListProps?: React.ComponentProps<typeof BottomSheetFlatList>;
  };
  closeOnBackdropPress?: boolean;
  dynamicSnapPoints?: boolean;
  minHeight?: string | number;
  maxHeight?: string | number;
  onClose?: () => void;
  showCloseButton?: boolean; // New optional prop
}

const ThemedReuseableSheet = forwardRef<BottomSheet, ReuseableSheetProps>(
  (
    {
      title,
      description,
      actions,
      customContent,
      customHeader,
      customFooter,
      styles: customStyles = {},
      contentType = 'scroll',
      contentProps = {},
      closeOnBackdropPress = true,
      snapPoints = [],
      dynamicSnapPoints = false,
      enableDynamicSizing = false,
      minHeight = '30%',
      maxHeight = '90%',
      onClose,
      showCloseButton = false, // Default to false
      ...bottomSheetProps
    },
    ref
  ) => {
    const { currentTheme } = useTheme();
    const bottomSheetRef = useRef<BottomSheet>(null);

    // Expose BottomSheet methods to parent component via ref
    useImperativeHandle(ref, () => ({
      expand: () => bottomSheetRef.current?.expand(),
      collapse: () => bottomSheetRef.current?.collapse(),
      close: () => {
        bottomSheetRef.current?.close();
        onClose?.();
      },
      snapToIndex: (index: number) => bottomSheetRef.current?.snapToIndex(index),
      snapToPosition: (position: string | number) => bottomSheetRef.current?.snapToPosition(position),
      forceClose: () => bottomSheetRef.current?.forceClose(),
    }));

    const handleClose = useCallback(() => {
      onClose?.();
    }, [onClose]);

    const renderIcon = (action: BottomSheetAction) => {
      const iconColor = currentTheme === 'light' ? Colors.light.icon : Colors.dark.icon;
      const iconSize = getResponsiveFontSize(18);

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

    const renderCloseButton = () => {
      if (!showCloseButton) return null;

      const iconColor = currentTheme === 'light' ? Colors.light.icon : Colors.dark.icon;

      return (
        <Pressable
          onPress={() => {
            bottomSheetRef.current?.close();
            onClose?.();
          }}
          style={styles.closeButton}
          hitSlop={{
            top: getResponsiveHeight(1.2),
            bottom: getResponsiveHeight(1.2),
            left: getResponsiveWidth(2.4),
            right: getResponsiveWidth(2.4),
          }}
        >
          <MaterialCommunityIcons name="close" size={getResponsiveFontSize(16)} color={iconColor} />
        </Pressable>
      );
    };

    // Determine snap points
    const resolvedSnapPoints = dynamicSnapPoints ? [minHeight, maxHeight] : snapPoints;

    // Render content based on contentType
    const renderContent = () => {
      switch (contentType) {
        case 'scroll':
          return (
            <BottomSheetScrollView
              contentContainerStyle={[styles.contentContainer, customStyles.container]}
              {...contentProps.scrollViewProps}
            >
              {renderContentBody()}
            </BottomSheetScrollView>
          );
        case 'flat':
          return (
            <BottomSheetFlatList
              contentContainerStyle={[styles.contentContainer, customStyles.container]}
              {...contentProps.flatListProps}
              renderItem={contentProps.flatListProps?.renderItem}
              data={contentProps.flatListProps?.data}
              ListHeaderComponent={() => renderContentBody()}
            />
          );
        default:
          return (
            <View style={[styles.contentContainer, customStyles.container]}>
              {renderContentBody()}
            </View>
          );
      }
    };

    // Render main content body
    const renderContentBody = () => (
      <>
        {/* Close button at the top right */}
        {renderCloseButton()}

        {/* Custom Header */}
        {customHeader}

        {/* Default Header Content */}
        {(title || description) && (
          <View style={styles.headerContent}>
            {title && (
              <ThemedText style={[styles.title, customStyles.title]}>{title}</ThemedText>
            )}
            {description && (
              <ThemedText style={[styles.description, customStyles.description]}>
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
                  action.disabled && styles.disabledButton,
                ]}
                hitSlop={{
                  top: getResponsiveHeight(1.2),
                  bottom: getResponsiveHeight(1.2),
                  left: getResponsiveWidth(2.4),
                  right: getResponsiveWidth(2.4),
                }}
              >
                {action.icon && renderIcon(action)}
                <ThemedText
                  style={[
                    styles.buttonText,
                    action.textStyle,
                    action.disabled && styles.disabledButtonText,
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
      </>
    );

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={resolvedSnapPoints}
        animateOnMount={true}
        onClose={handleClose}
        containerStyle={{ zIndex: 10 }}
        enableDynamicSizing={enableDynamicSizing}
        backgroundStyle={[
          styles.background,
          {
            backgroundColor:
              currentTheme === 'light' ? Colors.light.background : Colors.dark.background,
          },
          customStyles.container,
        ]}
        handleStyle={[
          styles.handle,
          {
            backgroundColor:
              currentTheme === 'light' ? Colors.light.background : Colors.dark.background,
          },
          customStyles.header,
        ]}
        handleIndicatorStyle={styles.handleIndicator}
        enablePanDownToClose={true}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            opacity={0.7}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
            onPress={
              closeOnBackdropPress
                ? () => {
                    bottomSheetRef.current?.close();
                    onClose?.();
                  }
                : undefined
            }
          />
        )}
        {...bottomSheetProps}
      >
        {renderContent()}
      </BottomSheet>
    );
  }
);

ThemedReuseableSheet.displayName = 'ThemedReuseableSheet';

const styles = StyleSheet.create({
  background: {
    backgroundColor: 'white',
    // borderTopLeftRadius: getResponsiveWidth(12),
    // borderTopRightRadius: getResponsiveWidth(12),
  },
  handle: {
    borderTopLeftRadius: getResponsiveWidth(12),
    borderTopRightRadius: getResponsiveWidth(12),
  },
  handleIndicator: {
    backgroundColor: '#ccc',
    width: getResponsiveWidth(15), // Responsive width for handle indicator
    height: getResponsiveHeight(0.6), // Responsive height for handle indicator
  },
  contentContainer: {
    paddingHorizontal: getResponsiveWidth(3.6),
    paddingBottom: getResponsiveHeight(1.8),
    paddingTop: getResponsiveHeight(0.6),
  },
  headerContent: {
    marginBottom: getResponsiveHeight(2.4),
    position: 'relative',
  },
  title: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: 'bold',
    textAlign: 'center',
  },
  description: {
    fontSize: getResponsiveFontSize(14),
    color: 'gray',
    textAlign: 'center',
  },
  buttonsContainer: {
    flexDirection: 'column',
    gap: getResponsiveHeight(0.6),
    marginTop: getResponsiveHeight(1),
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveWidth(2.4),
    paddingVertical: getResponsiveHeight(1.2),
    paddingHorizontal: getResponsiveWidth(2.4),
    borderRadius: getResponsiveWidth(4),
    overflow: 'hidden',
  },
  buttonText: {
    fontSize: getResponsiveFontSize(16),
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledButtonText: {
    color: 'gray',
  },
  closeButton: {
    position: 'absolute',
    top: getResponsiveHeight(0.6),
    right: getResponsiveWidth(3.6),
    // borderRadius: getResponsiveWidth(4.8),
    padding: getResponsiveWidth(1.2),
    zIndex: 1,
  },
});

export default ThemedReuseableSheet;