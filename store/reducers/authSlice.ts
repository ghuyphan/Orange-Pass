import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import UserRecord from "@/types/userType";

interface AuthState {
    token: string | null;
    user: UserRecord | null;
    isAuthenticated: boolean;
}

const initialState: AuthState = {
    token: null,
    user: null,
    isAuthenticated: false,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setAuthData: (state, action: PayloadAction<{ token: string; user: UserRecord }>) => {
            state.token = action.payload.token;
            state.user = action.payload.user;
            state.isAuthenticated = true;
        },
        clearAuthData: (state) => {
            state.token = null;
            state.user = null;
            state.isAuthenticated = false;
        },
    },
});

export const { setAuthData, clearAuthData } = authSlice.actions;
export default authSlice.reducer;