// src/store/thunks/qrThunks.ts
import { AnyAction } from "redux"; // Or your specific Action type
import { ThunkAction } from "redux-thunk";
import { RootState, store } from "../rootReducer";
import { getQrCodesByUserId } from "@/services/localDB/qrDB";
import { setQrData } from "@/store/reducers/qrSlice";
import { GUEST_USER_ID } from "@/constants/Constants";

// Define AppThunk type if you haven't already
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  AnyAction // Or your specific Action type
>;

export const loadUserQrDataThunk =
  (userId: string): AppThunk =>
  async (dispatch) => {
    try {
       (`[qrThunk] Loading QR data for user: ${userId}`);
      const qrData = await getQrCodesByUserId(userId);
      dispatch(setQrData(qrData));
       (
        `[qrThunk] Loaded ${qrData.length} QR codes for user ${userId}.`
      );
    } catch (error) {
      console.error(
        `[qrThunk] Failed to load QR data for user ${userId}:`,
        error
      );
      // dispatch(setQrData([])); // Optionally clear or set error state
    }
  };

export const loadGuestQrDataThunk =
  (): AppThunk => async (dispatch) => {
    try {
       ("[qrThunk] Loading QR data for GUEST user.");
      const qrData = await getQrCodesByUserId(GUEST_USER_ID);
      dispatch(setQrData(qrData));
       (`[qrThunk] Loaded ${qrData.length} QR codes for GUEST.`);
    } catch (error) {
      console.error("[qrThunk] Failed to load GUEST QR data:", error);
      // dispatch(setQrData([])); // Optionally clear or set error state
    }
  };
