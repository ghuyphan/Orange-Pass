import React, { createContext, useContext, useEffect, useCallback, useState } from 'react';
import { syncQrCodes } from '@/services/localDB/qrDB';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/rootReducer';

type DataContextType = {
  isSyncing: boolean;
  syncData: () => Promise<void>;
};

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const userId = useSelector((state: RootState) => state.auth.user?.id ?? '');
  const isOffline = useSelector((state: RootState) => state.network.isOffline);
  const [isSyncing, setIsSyncing] = useState(false);

  // Hàm để đồng bộ dữ liệu với server
  const syncData = useCallback(async () => {
    if (!userId || isOffline) return;
    setIsSyncing(true);
    try {
      await syncQrCodes(userId);
      console.log('Data synced successfully');
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [userId, isOffline]);

  useEffect(() => {
    // Đồng bộ dữ liệu khi ứng dụng khởi động
    syncData();
  }, [syncData]);

  return (
    <DataContext.Provider value={{ isSyncing, syncData }}>
      {children}
    </DataContext.Provider>
  );
};

export const useDataContext = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useDataContext must be used within a DataProvider');
  return context;
};
