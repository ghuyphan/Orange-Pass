// components/UnsavedChangesBackHandler.tsx
import React, {
  forwardRef,
  useCallback,
  useState,
  useImperativeHandle,
  RefObject,
  MutableRefObject,
} from "react";
import { useFocusEffect } from "expo-router";
import { BackHandler } from "react-native";
import BottomSheet from "@gorhom/bottom-sheet";
import { ThemedModal } from "./ThemedIconModal"; // Adjust path if needed
import { t } from "@/i18n";

/**
 * The interface for the imperative handle, allowing parent components
 * to call methods on this component instance.
 */
export interface UnsavedChangesBackHandlerRef {
  /**
   * Programmatically displays the confirmation modal.
   */
  showModal: () => void;
}

interface UnsavedChangesBackHandlerProps {
  /**
   * The function to call to perform the actual back navigation.
   */
  onNavigateBack: () => void;
  /**
   * A boolean indicating if there are unsaved changes.
   */
  isDirty: boolean;
  /**
   * A ref to a BottomSheet component. If the sheet is open, the back
   * press will close it first.
   */
  bottomSheetRef: RefObject<BottomSheet>;
  /**
   * A ref whose `.current` property is `true` if the bottom sheet is
   * currently visible. Used to check state without causing re-renders.
   */
  isSheetVisibleRef: MutableRefObject<boolean>;
}

/**
 * A component that manages the Android hardware back press behavior,
 * specifically for screens with unsaved changes (`isDirty` state) and
 * an optional BottomSheet.
 *
 * It handles the following back press logic in order:
 * 1. Closes its own confirmation modal if it's visible.
 * 2. Closes the provided BottomSheet if it's visible.
 * 3. Shows the confirmation modal if `isDirty` is true.
 * 4. Calls `onNavigateBack` if the screen is not dirty.
 */
const UnsavedChangesBackHandler = forwardRef<
  UnsavedChangesBackHandlerRef,
  UnsavedChangesBackHandlerProps
>((props, ref) => {
  const { onNavigateBack, isDirty, isSheetVisibleRef, bottomSheetRef } = props;
  const [isModalVisible, setIsModalVisible] = useState(false);

  const showModal = useCallback(() => {
    setIsModalVisible(true);
  }, []);

  // Expose the showModal function to parent components via the ref
  useImperativeHandle(
    ref,
    () => ({
      showModal,
    }),
    [showModal]
  );

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // 1. If the confirmation modal is already visible, the back press should close it.
        if (isModalVisible) {
          setIsModalVisible(false);
          return true; // Prevent default behavior (exiting app)
        }

        // 2. If the bottom sheet is visible, close it.
        if (isSheetVisibleRef.current) {
          bottomSheetRef.current?.close();
          return true; // Prevent default behavior
        }

        // 3. If there are unsaved changes, show the confirmation modal.
        if (isDirty) {
          setIsModalVisible(true);
          return true; // Prevent default behavior
        }

        // 4. If not dirty and no modals/sheets are open, perform the navigation.
        onNavigateBack();
        return true; // Prevent default behavior
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );

      return () => subscription.remove();
    }, [isModalVisible, isDirty, onNavigateBack, isSheetVisibleRef, bottomSheetRef])
  );

  const handleDiscard = useCallback(() => {
    setIsModalVisible(false);
    onNavigateBack();
  }, [onNavigateBack]);

  return (
    <ThemedModal
      isVisible={isModalVisible}
      onDismiss={() => setIsModalVisible(false)}
      onPrimaryAction={() => setIsModalVisible(false)}
      primaryActionText={t("common.back")}
      message={t("common.unsavedChanges")}
      title={t("common.unsavedChangesTitle")}
      secondaryActionText={t("common.discard")}
      onSecondaryAction={handleDiscard}
      iconName="report-problem" // A more fitting icon for a warning
    />
  );
});

UnsavedChangesBackHandler.displayName = "UnsavedChangesBackHandler";

export default UnsavedChangesBackHandler;