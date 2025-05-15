import { combineReducers } from "@reduxjs/toolkit";
import authSlice from "./reducers/authSlice";
import networkSlice from "./reducers/networkSlice";
import errorSlice from "./reducers/errorSlice";
import qrSlice from "./reducers/qrSlice";
import authStatusSlice from "./reducers/authStatusSlice"
import { configureStore } from '@reduxjs/toolkit';

// Combine your reducers
const rootReducer = combineReducers({
    auth: authSlice,
    network: networkSlice,
    error: errorSlice,
    qr: qrSlice,
    authStatus: authStatusSlice,
});

// Define the RootState type, which represents the entire Redux state
export type RootState = ReturnType<typeof rootReducer>;

// Create store type
export const store = configureStore({
    reducer: rootReducer,
});

// Export dispatch type
export type AppDispatch = typeof store.dispatch;

export default rootReducer;
