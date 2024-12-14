import { combineReducers } from "@reduxjs/toolkit";
import authSlice from "./reducers/authSlice";
import networkSlice from "./reducers/networkSlice";
import errorSlice from "./reducers/errorSlice";
import qrSlice from "./reducers/qrSlice";

// Combine your reducers
const rootReducer = combineReducers({
    auth: authSlice,
    network: networkSlice,
    error: errorSlice,
    qr: qrSlice
});

// Define the RootState type, which represents the entire Redux state
export type RootState = ReturnType<typeof rootReducer>;

export default rootReducer;
