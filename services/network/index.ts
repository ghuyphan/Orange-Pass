import NetInfo from '@react-native-community/netinfo';
import { store } from '@/store';
import { setOfflineStatus } from '@/store/reducers/networkSlice';

export const checkOfflineStatus = () => {
  return NetInfo.addEventListener(state => {
    store.dispatch(setOfflineStatus(!state.isConnected));
  });
};