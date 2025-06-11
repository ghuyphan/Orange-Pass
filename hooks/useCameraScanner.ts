import { useState, useRef, useCallback, useEffect } from "react";
import { Code, CodeScannerFrame } from "react-native-vision-camera";
import { useMMKVBoolean } from "react-native-mmkv";
import { storage } from "@/utils/storage";
import useHandleCodeScanned from "@/hooks/useHandleCodeScanned";
import { triggerLightHapticFeedback } from "@/utils/haptic";
import { MaterialIcons } from "@expo/vector-icons";
import { t } from "@/i18n";

interface CameraHighlight {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const useCameraScanner = () => {
  const frameCounterRef = useRef(0);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lockedCodeRef = useRef<string | null>(null);

  // Scanner-related states
  const [scanFrame, setScanFrame] = useState<CodeScannerFrame>({
    height: 1,
    width: 1,
  });
  const [codeScannerHighlights, setCodeScannerHighlights] = useState<
    CameraHighlight[]
  >([]);
  const [codeMetadata, setCodeMetadata] = useState("");
  const [codeValue, setCodeValue] = useState("");
  const [codeType, setCodeType] = useState("");
  const [iconName, setIconName] =
    useState<keyof typeof MaterialIcons.glyphMap>("explore");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCodeLocked, setIsCodeLocked] = useState(false); // Your state to track lock status

  // Settings states
  const [showIndicator, setShowIndicator] = useState(true);
  const [showIndicatorMMKV, setShowIndicatorMMKV] = useMMKVBoolean(
    "showIndicator",
    storage,
  );

  const handleCodeScanned = useHandleCodeScanned();

  // Renamed to be more specific, this is the full reset
  const resetScanner = useCallback(() => {
    setIsConnecting(false);
    setCodeType("");
    setCodeValue("");
    setCodeScannerHighlights([]);
    setCodeMetadata("");
    setIsCodeLocked(false);
    lockedCodeRef.current = null;
  }, []);

  useEffect(() => {
    if (showIndicatorMMKV !== undefined) {
      setShowIndicator(showIndicatorMMKV);
    }
  }, [showIndicatorMMKV]);

  const toggleShowIndicator = useCallback(() => {
    setShowIndicator((prev) => {
      const newValue = !prev;
      setShowIndicatorMMKV(newValue); // Persist to MMKV
      return newValue;
    });
    triggerLightHapticFeedback();
  }, [setShowIndicator, setShowIndicatorMMKV]);

  const createCodeScannerCallback = useCallback(
    (codes: Code[], frame: CodeScannerFrame) => {
      if (isConnecting || frameCounterRef.current++ % 4 !== 0) return;

      setScanFrame(frame);
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }

      // --- REFINED LOGIC ---

      if (isCodeLocked) {
        // We are locked. We must find our specific code, regardless of its position in the array.
        const lockedCode = codes.find(
          (c) => c.value === lockedCodeRef.current,
        );

        if (lockedCode) {
          // We found it! Track it by updating the highlight.
          if (showIndicator) {
            const { frame: codeFrame } = lockedCode;
            setCodeScannerHighlights([
              {
                height: codeFrame?.height ?? 0,
                width: codeFrame?.width ?? 0,
                x: codeFrame?.x ?? 0,
                y: codeFrame?.y ?? 0,
              },
            ]);
          }
        } else {
          // The code we were locked onto is no longer visible. Reset everything.
          resetScanner();
        }
      } else {
        // We are not locked. Look for a new code to scan.
        if (codes.length > 0) {
          const firstCode = codes[0];
          const { value, frame: codeFrame } = firstCode;
          const currentCodeValue = value ?? "";

          if (!currentCodeValue) return; // Ignore empty codes

          // --- LOCK ONTO THE NEW CODE ---
          lockedCodeRef.current = currentCodeValue;
          setIsCodeLocked(true); // This triggers the lock
          setCodeMetadata(currentCodeValue);

          // Process the newly found code
          const result = handleCodeScanned(currentCodeValue, {
            t,
            setIsConnecting,
          });
          setCodeType(result.codeType);
          setIconName(result.iconName);
          setCodeValue(result.rawCodeValue);

          // Show initial highlight
          if (showIndicator) {
            setCodeScannerHighlights([
              {
                height: codeFrame?.height ?? 0,
                width: codeFrame?.width ?? 0,
                x: codeFrame?.x ?? 0,
                y: codeFrame?.y ?? 0,
              },
            ]);
            // Optional: hide highlight after a delay if you want it to be temporary
            highlightTimeoutRef.current = setTimeout(() => {
              setCodeScannerHighlights([]);
            }, 2000);
          }
        } else {
          // No codes are visible and we are not locked, so do nothing.
          // The state is already clean.
        }
      }
    },
    [
      isConnecting,
      isCodeLocked,
      showIndicator,
      handleCodeScanned,
      resetScanner,
    ],
  );

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  return {
    scanFrame,
    codeScannerHighlights,
    codeMetadata,
    codeValue,
    codeType,
    iconName,
    showIndicator,
    toggleShowIndicator,
    createCodeScannerCallback,
    resetCodeState: resetScanner, // Expose the full reset function
    isCodeLocked,
    unlockScanning: resetScanner, // The manual unlock should do a full reset
  };
};