import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { ThemedText } from '../ThemedText';
import { Colors } from '@/constants/Colors';
import { Portal } from 'react-native-paper';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import CustomBackdrop from './bottomsheetBackdrop';

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
  ({ 
    title,
    description,
    deleteText,
    onDeletePress,
    editText,
    onEditPress
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

    return (
      <Portal>
        <BottomSheet
          ref={bottomSheetRef}
          index={-1}
          animateOnMount={true}
          backgroundStyle={[styles.background, { 
            backgroundColor: currentTheme === 'light' ? Colors.light.background : Colors.dark.background 
          }]}
          handleStyle={[styles.handle, {
            backgroundColor: currentTheme === 'light' ? Colors.light.background : Colors.dark.background,
          }]}
          handleIndicatorStyle={styles.handleIndicator}
          enablePanDownToClose={true}
          enableDynamicSizing={true}
          backdropComponent={(props) => (
            <CustomBackdrop 
              {...props} 
              onPress={() => bottomSheetRef.current?.close()} 
            />
          )}
        >
          <BottomSheetScrollView contentContainerStyle={styles.contentContainer}>
            {title && <ThemedText style={styles.title}>{title}</ThemedText>}
            {description && <ThemedText style={styles.description}>{description}</ThemedText>}
            <View style={styles.buttonsContainer}>
              <Pressable
                onPress={onEditPress}
                style={[styles.button, {
                }]}
                android_ripple={{ 
                  color: currentTheme === 'light' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)', 
                  foreground: true, 
                  borderless: false 
                }}
              >
                <MaterialCommunityIcons 
                  name="pencil-outline" 
                  size={18} 
                  color={currentTheme === 'light' ? Colors.light.text : Colors.dark.text} 
                />
                <ThemedText style={styles.buttonText}>{editText}</ThemedText>
              </Pressable>
              <Pressable
                onPress={onDeletePress}
                style={[styles.button, {
                }]}
                android_ripple={{ 
                  color: currentTheme === 'light' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)', 
                  foreground: true, 
                  borderless: false 
                }}
              >
                <MaterialIcons 
                  name="delete-outline" 
                  size={18} 
                  color={currentTheme === 'light' ? Colors.light.text : Colors.dark.text} 
                />
                <ThemedText style={styles.buttonText}>{deleteText}</ThemedText>
              </Pressable>
            </View>
          </BottomSheetScrollView>
        </BottomSheet>
      </Portal>
    );
  }
);

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
    padding: 20,
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
  buttonsContainer: {
    flexDirection: 'column',
    gap: 5,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,

    borderRadius: 10,
  },
  buttonText: {
    fontSize: 16,
  },
});

export default ThemedBottomSheet;