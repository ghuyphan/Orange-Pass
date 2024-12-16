import { createSlice } from '@reduxjs/toolkit';
import QRRecord from '@/types/qrType';

const qrSlice = createSlice({
  name: 'qr',
  initialState: {
    qrData: [] as QRRecord[]
  },
  reducers: {
    setQrData: (state, action) => {
      state.qrData = action.payload;
    },
    addQrData: (state, action) => {
      state.qrData.push(action.payload);
    },
    updateQrData: (state, action) => {
      const index = state.qrData.findIndex(qr => qr.id === action.payload.id);
      if (index !== -1) {
        state.qrData[index] = action.payload;
      }
    },
    removeQrData: (state, action) => {
      state.qrData = state.qrData.filter(qr => qr.id !== action.payload);
    },
    removeAllQrData: (state) => {
      state.qrData = []; // Simply set the qrData array to an empty array
    }
  }
});

export const { 
  setQrData, 
  addQrData, 
  updateQrData, 
  removeQrData,
  removeAllQrData
} = qrSlice.actions;

export default qrSlice.reducer;