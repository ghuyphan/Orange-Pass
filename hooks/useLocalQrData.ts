import { useState, useEffect } from 'react';
import { getQrCodesByUserId } from '@/services/localDB/qrDB';
import QRRecord from '@/types/qrType';

const useLocalQrData = (userId: string): { localQrData: QRRecord[]; isLoading: boolean; error: Error | null } => {
  const [localQrData, setLocalQrData] = useState<QRRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchLocalData = async () => {
      try {
        const data = await getQrCodesByUserId(userId);
        setLocalQrData(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchLocalData();
    }
  }, [userId]);

  return { localQrData, isLoading, error };
};

export default useLocalQrData;