import { useState, useRef, useCallback, useEffect } from 'react';
import { Code, CodeScannerFrame, Point } from 'react-native-vision-camera';
import { useMMKVBoolean } from 'react-native-mmkv';
import { storage } from '@/utils/storage';
import useHandleCodeScanned from '@/hooks/useHandleCodeScanned';
import { triggerLightHapticFeedback } from '@/utils/haptic';
import { MaterialIcons } from '@expo/vector-icons';
import { t } from '@/i18n';

interface CameraHighlight {
  corners: Point[] | undefined;
}

export const useCameraScanner = () => {
  const frameCounterRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scanner-related states
  const [scanFrame, setScanFrame] = useState<CodeScannerFrame>({ height: 1, width: 1 });
  const [codeScannerHighlights, setCodeScannerHighlights] = useState<CameraHighlight[]>([]);
  const [codeMetadata, setCodeMetadata] = useState('');
  const [codeValue, setCodeValue] = useState('');
  const [codeType, setCodeType] = useState('');
  const [iconName, setIconName] = useState<keyof typeof MaterialIcons.glyphMap>('explore');
  const [isConnecting, setIsConnecting] = useState(false);

  // Settings states
  const [quickScan, setQuickScan] = useState(false);
  const [showIndicator, setShowIndicator] = useState(true);

  const [quickScanMMKV, setQuickScanMMKV] = useMMKVBoolean('quickScan', storage);
  const [showIndicatorMMKV, setShowIndicatorMMKV] = useMMKVBoolean('showIndicator', storage);

  useEffect(() => {
    if (quickScanMMKV !== undefined) {
      setQuickScan(quickScanMMKV);
    }
  }, [quickScanMMKV]);

  useEffect(() => {
    if (showIndicatorMMKV !== undefined) {
      setShowIndicator(showIndicatorMMKV);
    }
  }, [showIndicatorMMKV]);

  const handleCodeScanned = useHandleCodeScanned();

  const toggleQuickScan = useCallback(() => {
    setQuickScan(prev => !!!prev);
    setQuickScanMMKV(prev => !!!prev);
    triggerLightHapticFeedback();
  }, [setQuickScan, setQuickScanMMKV]);

  const toggleShowIndicator = useCallback(() => {
    setShowIndicator(prev => !!!prev);
    setShowIndicatorMMKV(prev => !!!prev);
    triggerLightHapticFeedback();
  }, [setShowIndicator, setShowIndicatorMMKV]);

  const createCodeScannerCallback = useCallback((codes: Code[], frame: CodeScannerFrame) => {
    if (isConnecting || frameCounterRef.current++ % 4 !== 0) return;

    setScanFrame(frame);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (codes.length > 0) {
      const firstCode = codes[0];
      const { value, corners, } = firstCode; // Extract corners directly

      console.log('Code scanned:', corners);

      setCodeMetadata(value ?? '');

      if (showIndicator) {
        setCodeScannerHighlights([{ corners }]); // Use corners directly

        timeoutRef.current = setTimeout(() => {
          setCodeScannerHighlights([]);
        }, 2000);
      } else {
        setCodeScannerHighlights([]);
      }

      const result = handleCodeScanned(value ?? '', {
        quickScan,
        t,
        setIsConnecting,
      });
      setCodeType(result.codeType);
      setIconName(result.iconName);
      setCodeValue(result.codeValue);
    } else {
      resetCodeState();
    }
  }, [quickScan, showIndicator, handleCodeScanned]);

  const resetCodeState = useCallback(() => {
    setIsConnecting(false);
    setCodeType('');
    setCodeValue('');
    setCodeScannerHighlights([]);
    setCodeMetadata('');
  }, []);

  return {
    scanFrame,
    codeScannerHighlights,
    codeMetadata,
    codeValue,
    codeType,
    iconName,
    quickScan,
    showIndicator,
    toggleQuickScan,
    toggleShowIndicator,
    createCodeScannerCallback,
    resetCodeState,
  };
};