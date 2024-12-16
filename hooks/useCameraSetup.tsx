import { useCallback, useState } from 'react';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';

export const useCameraSetup = (cameraRef: React.RefObject<Camera>) => {
  const device = useCameraDevice('back');
  const { hasPermission } = useCameraPermission();
  const [torch, setTorch] = useState<'off' | 'on'>('off');

  const toggleFlash = useCallback(() => {
    if (device?.hasFlash) {
      setTorch(prevTorch => (prevTorch === 'off' ? 'on' : 'off'));
    } else {
      console.warn('This device does not have a flash');
    }
  }, [device?.hasFlash]);

  return { device, hasPermission, torch, toggleFlash };
};