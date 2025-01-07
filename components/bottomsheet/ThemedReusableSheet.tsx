import React, { forwardRef, useImperativeHandle, useRef, ReactNode, useCallback } from 'react';
import { View, StyleSheet, Pressable, ViewStyle, TextStyle, BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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
    scrollView?: ViewStyle;
    scrollViewContent?: ViewStyle;
    flatList?: ViewStyle;
    flatListContent?: ViewStyle;
    customContent?: ViewStyle;
    buttonsContainer?: ViewStyle;
    headerContent?: ViewStyle;
    closeButton?: ViewStyle;
    backdrop?: ViewStyle;
    background?: ViewStyle;
    handle?: ViewStyle;
    handleIndicator?: ViewStyle;
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
  showCloseButton?: boolean;
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
    contentType = 'scroll',
    contentProps = {},
    closeOnBackdropPress = true,
    snapPoints = [],
    dynamicSnapPoints = false,
    enableDynamicSizing = false,
    minHeight = '30%',
    maxHeight = '90%',
    onClose,
    showCloseButton = false,
    ...bottomSheetProps
  }, ref) => {
    const { currentTheme } = useTheme();
    const bottomSheetRef = useRef<BottomSheet>(null);
    const isSheetVisible = useRef(false);

    useFocusEffect(
      useCallback(() => {
        const onBackPress = () => {
          if (isSheetVisible.current) {
            bottomSheetRef.current?.close();
            onClose?.();
            return true;
          }
          return false;
        };

        BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
      }, [onClose])
    );

    const handleSheetChange = useCallback((index: number) => {
      isSheetVisible.current = index >= 0;
    }, []);

    useImperativeHandle(ref, () => ({
      expand: () => {
        bottomSheetRef.current?.expand();
        isSheetVisible.current = true;
      },
      collapse: () => {
        bottomSheetRef.current?.collapse();
        isSheetVisible.current = true;
      },
      close: () => {
        bottomSheetRef.current?.close();
        isSheetVisible.current = false;
        onClose?.();
      },
      snapToIndex: (index: number) => {
        bottomSheetRef.current?.snapToIndex(index);
        isSheetVisible.current = true;
      },
      snapToPosition: (position: string | number) => {
        bottomSheetRef.current?.snapToPosition(position);
        isSheetVisible.current = true;
      },
      forceClose: () => {
        bottomSheetRef.current?.forceClose();
        isSheetVisible.current = false;
      },
    }));

    const handleClose = useCallback(() => {
      isSheetVisible.current = false;
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
          style={[styles.closeButton, customStyles.closeButton]}
          hitSlop={{
            top: getResponsiveHeight(1.2),
            bottom: getResponsiveHeight(1.2),
            left: getResponsiveWidth(2.4),
            right: getResponsiveWidth(2.4),
          }}
        >
          <MaterialCommunityIcons
            name="close"
            size={getResponsiveFontSize(16)}
            color={iconColor}
          />
        </Pressable>
      );
    };

    const renderHeader = () => (
      <View style={[styles.headerContainer, customStyles.header]}>
        {renderCloseButton()}
        {customHeader}
        {(title || description) && (
          <View style={[styles.headerContent, customStyles.headerContent]}>
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
      </View>
    );

    const renderContentBody = () => (
      <>
        {customContent}
        {actions && (
          <View style={[styles.buttonsContainer, customStyles.buttonsContainer]}>
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
        {customFooter}
      </>
    );

    const renderContent = () => {

      switch (contentType) {
        case 'scroll':
          return (
            <>
              {renderHeader()}
              <BottomSheetScrollView
                showsVerticalScrollIndicator={false}
                style={[customStyles.scrollView]}
                contentContainerStyle={[
                  styles.contentContainer,
                  customStyles.scrollViewContent,
                ]}
                {...contentProps.scrollViewProps}
              >
                {renderContentBody()}
              </BottomSheetScrollView>
            </>
          );
        case 'flat':
          return (
            <>
              {renderHeader()}
              <View style={[styles.flatListContainer, customStyles.flatList]}>
                <BottomSheetFlatList
                  contentContainerStyle={[
                    styles.contentContainer,
                    customStyles.flatListContent,
                  ]}
                  {...contentProps.flatListProps}
                  renderItem={contentProps.flatListProps?.renderItem}
                  data={contentProps.flatListProps?.data}
                />
              </View>
            </>
          );
        default:
          return (
            <>
              {renderHeader()}
              <View style={[styles.contentContainer, customStyles.customContent]}>
                {renderContentBody()}
              </View>
            </>
          );
      }
    };

    const resolvedSnapPoints = dynamicSnapPoints ? [minHeight, maxHeight] : snapPoints;

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={resolvedSnapPoints}
        animateOnMount={true}
        onClose={handleClose}
        onChange={handleSheetChange}
        containerStyle={{ zIndex: 10 }}
        enableDynamicSizing={enableDynamicSizing}
        backgroundStyle={[
          styles.background,
          {
            backgroundColor:
              currentTheme === 'light' ? Colors.light.background : Colors.dark.background,
          },
          customStyles.background,
        ]}
        handleStyle={[
          styles.handle,
          {
            backgroundColor:
              currentTheme === 'light' ? Colors.light.background : Colors.dark.background,
          },
          customStyles.handle,
        ]}
        handleIndicatorStyle={[styles.handleIndicator, customStyles.handleIndicator]}
        enablePanDownToClose={true}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            opacity={0.5}
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

const styles = StyleSheet.create({
  background: {
    backgroundColor: 'white',
  },
  handle: {
    borderTopLeftRadius: getResponsiveWidth(12),
    borderTopRightRadius: getResponsiveWidth(12),
  },
  handleIndicator: {
    backgroundColor: '#ccc',
    width: getResponsiveWidth(12),
    height: getResponsiveHeight(0.6),
  },
  headerContainer: {
    // paddingVertical: getResponsiveHeight(1.8),
    marginBottom: getResponsiveHeight(0.6),
    paddingHorizontal: getResponsiveWidth(3.6),
    paddingTop: getResponsiveHeight(0.6),
    position: 'relative',
  },
  flatListContainer: {
    flex: 1,
    // marginVertical: getResponsiveHeight(1.8),
  },
  contentContainer: {
    // paddingHorizontal: getResponsiveWidth(3.6),
    // paddingVertical: getResponsiveHeight(1.8),
    marginBottom: getResponsiveHeight(1.8),
  },
  headerContent: {
    marginBottom: getResponsiveHeight(1.8),
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
    marginTop: getResponsiveHeight(0.6),
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
    padding: getResponsiveWidth(1.2),
    zIndex: 1,
  },
});

ThemedReuseableSheet.displayName = 'ThemedReuseableSheet';

export default ThemedReuseableSheet;