import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface AuthState {
  isAuthenticated: boolean;
  tenantId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  userName: string | null;
  isMaster: boolean;
  decimalPart: number;
  currencySymbol: string;
  companyConfig: {
    isRegistered: boolean;
  };
}

const initialState: AuthState = {
  // Manual re-hydration from localStorage to persist state across refreshes
  isAuthenticated: !!localStorage.getItem("accessToken"),
  tenantId: localStorage.getItem("tenantId"),
  accessToken: localStorage.getItem("accessToken"),
  refreshToken: localStorage.getItem("refreshToken"),
  userId: localStorage.getItem("userId"),
  userName: localStorage.getItem("userName"),
  isMaster: localStorage.getItem("isMaster") === "true",
  decimalPart: Number(localStorage.getItem("decimalPart")) || 2,
  currencySymbol: localStorage.getItem("currencySymbol") || "BHD",
  companyConfig: {
    isRegistered: localStorage.getItem("companyRegistered") === "true",
  },
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        tenantId: string | null;
        accessToken: string;
        refreshToken: string;
        userId: string | number;
        userName: string;
        isMaster: boolean;
        decimalPart: number;
        currencySymbol: string;
      }>
    ) => {
      const p = action.payload;
      state.isAuthenticated = true;
      state.tenantId = p.tenantId;
      state.accessToken = p.accessToken;
      state.refreshToken = p.refreshToken;
      state.userId = String(p.userId);
      state.userName = p.userName;
      state.isMaster = p.isMaster;
      state.decimalPart = p.decimalPart;
      state.currencySymbol = p.currencySymbol;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.accessToken = null;
      state.refreshToken = null;
      state.userId = null;
      state.userName = null;
      state.isMaster = false;
      state.decimalPart = 2;
      state.currencySymbol = "BHD";
      
      // Essential cleanup: Only remove user-session data.
      // Do NOT remove "companyRegistered" or "tenantId" as they identify the device.
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("userId");
      localStorage.removeItem("userName");
      localStorage.removeItem("isMaster");
      localStorage.removeItem("decimalPart");
      localStorage.removeItem("currencySymbol");
      localStorage.removeItem("sessionExpiresAt");
    },
    setCompanyConfig: (
      state,
      action: PayloadAction<{ decimalPart?: number; isRegistered?: boolean; currencySymbol?: string }>
    ) => {
      if (action.payload.decimalPart !== undefined) {
        state.decimalPart = action.payload.decimalPart;
        localStorage.setItem("decimalPart", String(action.payload.decimalPart));
      }
      if (action.payload.currencySymbol !== undefined) {
        state.currencySymbol = action.payload.currencySymbol;
        localStorage.setItem("currencySymbol", action.payload.currencySymbol);
      }
      if (action.payload.isRegistered !== undefined) {
        state.companyConfig.isRegistered = action.payload.isRegistered;
        localStorage.setItem("companyRegistered", String(action.payload.isRegistered));
      }
    },
  },
});

export const { setCredentials, logout, setCompanyConfig } = authSlice.actions;

// ─── Selectors ──────────────────────────────────────────────────────────────
import type { RootState } from '../../../app/store';

export const selectDecimalPart = (state: RootState) => state.auth.decimalPart;
export const selectCurrencySymbol = (state: RootState) => state.auth.currencySymbol;

export default authSlice.reducer;
