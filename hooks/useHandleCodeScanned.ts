// useHandleCodeScanned.ts
import { useCallback } from 'react';
import { throttle } from 'lodash';
import { analyzeCode, ExtractionOptions, ScanResult } from '@/utils/qrUtils';

const useHandleCodeScanned = () => {
    const handleCodeScanned = useCallback(
        throttle(
            (codeMetadata: string, options: ExtractionOptions): ScanResult => {
                return analyzeCode(codeMetadata, options);
            },
            500
        ),
        []
    );

    return handleCodeScanned;
};

export default useHandleCodeScanned;