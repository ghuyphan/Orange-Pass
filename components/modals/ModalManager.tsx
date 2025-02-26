// ModalManager.tsx (Create a new file:  components/ModalManager.tsx)
import React, { forwardRef, useCallback, useState, useImperativeHandle } from 'react';
import { useFocusEffect } from 'expo-router';
import { BackHandler } from 'react-native';
import { ThemedModal } from './ThemedIconModal'; // Adjust path if needed
import { t } from '@/i18n';  // Make sure this import path is correct
import BottomSheet from '@gorhom/bottom-sheet';

interface ModalManagerRef {
    showModal: () => void;
}

interface ModalManagerProps {
    onNavigateBack: () => void;
    dirty: boolean;
    isSheetVisible: React.MutableRefObject<boolean>;
    bottomSheetRef: React.RefObject<BottomSheet>; 
}

const ModalManager = forwardRef<ModalManagerRef, ModalManagerProps>((props, ref) => {
    const { onNavigateBack, dirty, isSheetVisible, bottomSheetRef } = props;
    const [isModalVisible, setIsModalVisible] = useState(false);

    const showModal = useCallback(() => {
        setIsModalVisible(true);
    }, []);

    useImperativeHandle(ref, () => ({
        showModal,
    }));

    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                if (isModalVisible) {
                    setIsModalVisible(false);
                    return true;
                }

                if (isSheetVisible.current) {
                    bottomSheetRef.current.close();
                    return true;
                }

                if (dirty) {
                    setIsModalVisible(true);
                    return true;
                }
                return false;
            };

            BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
        }, [isModalVisible, dirty, onNavigateBack, isSheetVisible])
    );

    return (
        <ThemedModal
            isVisible={isModalVisible}
            onDismiss={() => setIsModalVisible(false)}
            onPrimaryAction={() => setIsModalVisible(false)}
            primaryActionText={t('common.back')}
            message={t('common.unsavedChanges')}
            title={t('common.unsavedChangesTitle')}
            secondaryActionText={t('common.discard')}
            onSecondaryAction={() => {
                setIsModalVisible(false);
                onNavigateBack();
            }}
            iconName="warning"
        />
    );
});

ModalManager.displayName = 'ModalManager';

export default ModalManager;