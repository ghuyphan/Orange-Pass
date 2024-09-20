import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ErrorState {
    message: string | null;
}

const initialState: ErrorState = {
    message: null,
};

const errorSlice = createSlice({
    name: 'error',
    initialState,
    reducers: {
        setErrorMessage: (state, action: PayloadAction<string>) => {
            state.message = action.payload;
        },
    },
});

export const { setErrorMessage } = errorSlice.actions;
export default errorSlice.reducer;