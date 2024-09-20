import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const networkSlice = createSlice({
    name: 'network',
    initialState: {
        isOffline: false,
    },
    reducers: {
        setOfflineStatus: (state, action: PayloadAction<boolean>) => {
            state.isOffline = action.payload;
        },
    },
});

export const { setOfflineStatus } = networkSlice.actions;
export default networkSlice.reducer;