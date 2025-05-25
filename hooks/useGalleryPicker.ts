import { useCallback } from 'react';
import ImagePicker from 'react-native-image-crop-picker';
import { decodeQR } from '@/utils/decodeQR';
import useHandleCodeScanned from '@/hooks/useHandleCodeScanned';

import SheetType from '@/types/sheetType';

type GalleryPickerOptions = {
    onOpenSheet: (type: SheetType, id?: string, url?: string, ssid?: string, pass?: string, isWep?: boolean, isHidden?: boolean) => void;
    onNavigateToAddScreen: (
        codeFormat?: number,
        codeValue?: string,
        bin?: string,
        codeType?: string,
        codeProvider?: string
    ) => void;
};

// Define a custom type for your scan result that includes the extra properties
type ExtendedScanResult = {
    codeFormat?: number;
    rawCodeValue: string;
    codeType: string;
    bin?: string;
    provider?: string;
    ssid?: string;
    password?: string;
    isWep?: boolean
    isHidden?: boolean
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
                    mediaType: 'photo',
                });

                if (!image.path) {
                    return;
                }

                const decode = await decodeQR(image.path);
                const codeValue = decode?.value ?? '';
                const codeFormat = decode?.format;

                const result: ExtendedScanResult | null = handleCodeScanned(codeValue, {
                    t: (key) => key, // Replace with your actual translation function
                    codeFormat: codeFormat,
                });

                console.log('Decoded QR code:', result);

                if (result) {
                    const actionMap: Record<string, () => void> = {
                        'WIFI': () => onOpenSheet('wifi', undefined, undefined, result.ssid, result.password, result.isWep, result.isHidden),
                        'URL': () => onOpenSheet('linking', undefined, result.rawCodeValue),
                        // Handle bank and ewallet, passing bin and provider if they exist
                        'bank': () => onNavigateToAddScreen(result.codeFormat, result.rawCodeValue, result.bin, result.codeType, result.provider),
                        'ewallet': () => onNavigateToAddScreen(result.codeFormat, result.rawCodeValue, result.bin, result.codeType, result.provider),
                        'alphanumeric': () => {
                            onNavigateToAddScreen(result.codeFormat, result.rawCodeValue);},
                        'unknown': () => console.log('Unknown code format:', result.rawCodeValue),
                    };

                    const action = actionMap[result.codeType] || actionMap['unknown'];
                    action();
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