import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface AuthState {
  isAuthenticated: boolean;
  tenantId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  userName: string | null;
  isMaster: boolean;
  companyConfig: {
    decimals: number;
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
  companyConfig: {
    decimals: Number(localStorage.getItem("decimals")) || 2,
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
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.tenantId = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.userId = null;
      state.userName = null;
      state.isMaster = false;
      state.companyConfig.isRegistered = false;
      
      // Essential cleanup
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("tenantId");
      localStorage.removeItem("userId");
      localStorage.removeItem("userName");
      localStorage.removeItem("isMaster");
      localStorage.removeItem("companyRegistered");
    },
    setCompanyConfig: (
      state,
      action: PayloadAction<{ decimals?: number; isRegistered?: boolean }>
    ) => {
      if (action.payload.decimals !== undefined) {
        state.companyConfig.decimals = action.payload.decimals;
        localStorage.setItem("decimals", String(action.payload.decimals));
      }
      if (action.payload.isRegistered !== undefined) {
        state.companyConfig.isRegistered = action.payload.isRegistered;
        localStorage.setItem("companyRegistered", String(action.payload.isRegistered));
      }
    },
  },
});

export const { setCredentials, logout, setCompanyConfig } = authSlice.actions;
export default authSlice.reducer;
