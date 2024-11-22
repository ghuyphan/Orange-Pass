import BarcodeScanning from '@react-native-ml-kit/barcode-scanning';

export const decodeQR = async (uri: string) => {
    try {
        // setIsDecoding(true);
        const result = await BarcodeScanning.scan(uri);
        if (result?.length > 0) {
            return { value: result[0].value, format: result[0].format };
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error decoding QR code:', error);
        return null;  // You might want to throw the error instead depending on your error-handling strategy
    }
};