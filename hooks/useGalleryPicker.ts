import { useCallback } from 'react';
import ImagePicker from 'react-native-image-crop-picker';
import { decodeQR } from '@/utils/decodeQR';
import useHandleCodeScanned from '@/hooks/useHandleCodeScanned';
import { router } from 'expo-router';

import SheetType from '@/types/sheetType';

type GalleryPickerOptions = {
    onOpenSheet: (type: SheetType, id?: string, url?: string, ssid?: string) => void;
    onNavigateToAddScreen: (
        codeFormat?: number,
        codeValue?: string,
        bin?: string,
        codeType?: string,
        codeProvider?: string
    ) => void;
};

export const useGalleryPicker = ({
    onOpenSheet,
    onNavigateToAddScreen,
}: GalleryPickerOptions) => {
    const handleCodeScanned = useHandleCodeScanned();

    const onOpenGallery = useCallback(
        async () => {
            try {
                const image = await ImagePicker.openPicker({
                    width: 300,
                    height: 400,
                    includeBase64: true,
                    mediaType: 'photo',
                });

                if (!image.path) {
                    return;
                }

                const decode = await decodeQR(image.path);

                const result = handleCodeScanned(decode?.value ?? '', {
                    t: (key) => key, // Replace with your actual translation function
                    codeFormat: decode?.format,
                });

                console.log('Decoded QR code:', result);

                if (result) {
                    switch (result.codeType) {
                        case 'WIFI':
                            onOpenSheet('wifi');
                            break;
                        case 'URL':
                            onOpenSheet('linking', undefined, result.rawCodeValue);
                            break;
                        case 'bank':
                        case 'ewallet':
                            onNavigateToAddScreen(
                                result.codeFormat,
                                result.rawCodeValue,
                                result.bin,
                                result.codeType,
                                result.provider
                            );
                            break;
                        case 'alphanumeric':
                            // Handle alphanumeric
                            break;
                        case 'unknown':
                            console.log('Unknown code format:', result.rawCodeValue);
                            break;
                    }
                } else {
                    console.log('Failed to decode QR code');
                }
            } catch (error) {
                console.log('Error opening image picker or handling code:', error);
            }
        },
        [handleCodeScanned, onNavigateToAddScreen, onOpenSheet]
    );

    return onOpenGallery;
};