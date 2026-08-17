import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { UserRole } from '../types';

export interface AuthState {
  isAuthenticated: boolean;
  tenantId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  userName: string | null;
  isMaster: boolean;
  branchId: number | null;
  activeBranchId: number | null;
  userRoles: UserRole[];
  decimalPart: number;
  currencySymbol: string;
  companyConfig: {
    isRegistered: boolean;
  };
}

const isBackoffice = sessionStorage.getItem("tempSystemType") === "backoffice" || localStorage.getItem("systemType") === "backoffice";

const getActiveBranchId = () => {
  const val = isBackoffice ? sessionStorage.getItem("backoffice_activeBranchId") : localStorage.getItem("activeBranchId");
  return val !== null ? Number(val) : null;
};

const initialState: AuthState = {
  // Manual re-hydration from localStorage or sessionStorage to persist state across refreshes
  isAuthenticated: isBackoffice ? !!sessionStorage.getItem("backoffice_accessToken") : !!localStorage.getItem("accessToken"),
  tenantId: localStorage.getItem("tenantId"),
  accessToken: isBackoffice ? sessionStorage.getItem("backoffice_accessToken") : localStorage.getItem("accessToken"),
  refreshToken: isBackoffice ? sessionStorage.getItem("backoffice_refreshToken") : localStorage.getItem("refreshToken"),
  userId: isBackoffice ? sessionStorage.getItem("backoffice_userId") : localStorage.getItem("userId"),
  userName: isBackoffice ? sessionStorage.getItem("backoffice_userName") : localStorage.getItem("userName"),
  isMaster: isBackoffice ? sessionStorage.getItem("backoffice_isMaster") === "true" : localStorage.getItem("isMaster") === "true",
  branchId: isBackoffice ? Number(sessionStorage.getItem("backoffice_branchId")) || null : Number(localStorage.getItem("branchId")) || null,
  activeBranchId: getActiveBranchId(),
  userRoles: isBackoffice
    ? (sessionStorage.getItem("backoffice_userRoles") ? JSON.parse(sessionStorage.getItem("backoffice_userRoles")!) : [])
    : (localStorage.getItem("userRoles") ? JSON.parse(localStorage.getItem("userRoles")!) : []),
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
        branchId?: number;
        userRoles: UserRole[];
        decimalPart: number;
        currencySymbol: string;
        sessionExpiresAt?: string;
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
      state.branchId = p.branchId || null;
      state.activeBranchId = p.branchId || null; // Initially set active branch to user's branch
      state.userRoles = p.userRoles;
      state.decimalPart = p.decimalPart;
      state.currencySymbol = p.currencySymbol;

      const isBackofficeMode = sessionStorage.getItem("tempSystemType") === "backoffice" || localStorage.getItem("systemType") === "backoffice";

      if (isBackofficeMode) {
        sessionStorage.setItem("backoffice_accessToken", p.accessToken);
        sessionStorage.setItem("backoffice_refreshToken", p.refreshToken);
        sessionStorage.setItem("backoffice_userId", String(p.userId));
        sessionStorage.setItem("backoffice_userName", p.userName);
        sessionStorage.setItem("backoffice_isMaster", String(p.isMaster));
        if (p.branchId) {
          sessionStorage.setItem("backoffice_branchId", String(p.branchId));
          sessionStorage.setItem("backoffice_activeBranchId", String(p.branchId));
        }
        sessionStorage.setItem("backoffice_userRoles", JSON.stringify(p.userRoles));
      } else {
        localStorage.setItem("accessToken", p.accessToken);
        localStorage.setItem("refreshToken", p.refreshToken);
        localStorage.setItem("userId", String(p.userId));
        localStorage.setItem("userName", p.userName);
        localStorage.setItem("isMaster", String(p.isMaster));
        if (p.branchId) {
          localStorage.setItem("branchId", String(p.branchId));
          localStorage.setItem("activeBranchId", String(p.branchId));
        }
        localStorage.setItem("userRoles", JSON.stringify(p.userRoles));
      }
      
      // Global settings
      localStorage.setItem("decimalPart", String(p.decimalPart));
      localStorage.setItem("currencySymbol", p.currencySymbol);
      if (p.tenantId) localStorage.setItem("tenantId", p.tenantId);
      if (p.sessionExpiresAt) {
        if (isBackofficeMode) sessionStorage.setItem("backoffice_sessionExpiresAt", p.sessionExpiresAt);
        else localStorage.setItem("sessionExpiresAt", p.sessionExpiresAt);
      }
    },

    logout: (state) => {
      state.isAuthenticated = false;
      state.accessToken = null;
      state.refreshToken = null;
      state.userId = null;
      state.userName = null;
      state.isMaster = false;
      state.branchId = null;
      state.activeBranchId = null;
      state.userRoles = [];
      state.decimalPart = 2;
      state.currencySymbol = "BHD";
      
      const isBackofficeMode = sessionStorage.getItem("tempSystemType") === "backoffice" || localStorage.getItem("systemType") === "backoffice";

      if (isBackofficeMode) {
        sessionStorage.removeItem("backoffice_accessToken");
        sessionStorage.removeItem("backoffice_refreshToken");
        sessionStorage.removeItem("backoffice_userId");
        sessionStorage.removeItem("backoffice_userName");
        sessionStorage.removeItem("backoffice_isMaster");
        sessionStorage.removeItem("backoffice_branchId");
        sessionStorage.removeItem("backoffice_activeBranchId");
        sessionStorage.removeItem("backoffice_userRoles");
        sessionStorage.removeItem("backoffice_sessionExpiresAt");
      } else {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("userId");
        localStorage.removeItem("userName");
        localStorage.removeItem("isMaster");
        localStorage.removeItem("branchId");
        localStorage.removeItem("activeBranchId");
        localStorage.removeItem("userRoles");
        localStorage.removeItem("sessionExpiresAt");
      }
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
    setActiveBranchId: (state, action: PayloadAction<number>) => {
      state.activeBranchId = action.payload;
      const isBackofficeMode = sessionStorage.getItem("tempSystemType") === "backoffice" || localStorage.getItem("systemType") === "backoffice";
      if (isBackofficeMode) {
        sessionStorage.setItem("backoffice_activeBranchId", String(action.payload));
      } else {
        localStorage.setItem("activeBranchId", String(action.payload));
      }
    },
    setUserRoles: (state, action: PayloadAction<UserRole[]>) => {
      state.userRoles = action.payload;
      const isBackofficeMode = sessionStorage.getItem("tempSystemType") === "backoffice" || localStorage.getItem("systemType") === "backoffice";
      if (isBackofficeMode) {
        sessionStorage.setItem("backoffice_userRoles", JSON.stringify(action.payload));
      } else {
        localStorage.setItem("userRoles", JSON.stringify(action.payload));
      }
    },
  },
});

export const { setCredentials, logout, setCompanyConfig, setActiveBranchId, setUserRoles } = authSlice.actions;

// ─── Selectors ──────────────────────────────────────────────────────────────
import type { RootState } from '../../../app/store';

export const selectDecimalPart = (state: RootState) => state.auth.decimalPart;
export const selectCurrencySymbol = (state: RootState) => state.auth.currencySymbol;
export const selectBranchId = (state: RootState) => state.auth.branchId;
export const selectActiveBranchId = (state: RootState) => state.auth.activeBranchId;
export const selectIsMaster = (state: RootState) => state.auth.isMaster;

export default authSlice.reducer;
