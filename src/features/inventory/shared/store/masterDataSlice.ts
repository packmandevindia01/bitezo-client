import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { productService } from '../../product/services/productService';
import type { ProductMasterData } from '../../product/types';
import * as branchApi from '../../branches/services/branchApi';

// Branch Master is kept as we need branches array across UI.
interface BranchItem {
  id: number;
  name: string;
}

export interface MasterDataState {
  data: ProductMasterData | null;
  branches: BranchItem[];
  loading: boolean;
  error: string | null;
}

const initialState: MasterDataState = {
  data: null,
  branches: [],
  loading: false,
  error: null,
};

export const fetchGlobalMasterData = createAsyncThunk(
  'masterData/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const [pMaster, namesRes, listRes] = await Promise.allSettled([
        productService.loadMasterData(),
        branchApi.fetchBranchNames(true),
        branchApi.fetchBranches(),
      ]);

      const branchMap = new Map<number, string>();
      if (namesRes.status === "fulfilled" && Array.isArray(namesRes.value)) {
        namesRes.value.forEach((b: any) => {
          const id = Number(b.id || b.branchId || 0);
          const name = String(b.branchName || b.name || "");
          if (id && id !== 0 && name) branchMap.set(id, name);
        });
      }
      if (listRes.status === "fulfilled" && Array.isArray(listRes.value)) {
        listRes.value.forEach((b: any) => {
          const id = Number(b.id || b.branchId || 0);
          const name = String(b.branchName || b.name || "");
          if (id && id !== 0 && name && !branchMap.has(id)) {
            branchMap.set(id, name);
          }
        });
      }

      const branches = Array.from(branchMap.entries()).map(([id, name]) => ({ id, name }));
      const pData = pMaster.status === "fulfilled" ? pMaster.value : null;

      return { pMaster: pData, branches };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load global master data';
      return rejectWithValue(msg);
    }
  }
);

export const fetchGlobalBranches = createAsyncThunk(
  'masterData/fetchBranches',
  async (_, { rejectWithValue }) => {
    try {
      const [namesRes, listRes] = await Promise.allSettled([
        branchApi.fetchBranchNames(true),
        branchApi.fetchBranches(),
      ]);
      const branchMap = new Map<number, string>();
      if (namesRes.status === "fulfilled" && Array.isArray(namesRes.value)) {
        namesRes.value.forEach((b: any) => {
          const id = Number(b.id || b.branchId || b.BranchId || b.Id || 0);
          const name = String(b.branchName || b.BranchName || b.name || b.Name || "");
          if (id && id !== 0 && name) branchMap.set(id, name);
        });
      }
      if (listRes.status === "fulfilled" && Array.isArray(listRes.value)) {
        listRes.value.forEach((b: any) => {
          const id = Number(b.id || b.branchId || b.BranchId || b.Id || 0);
          const name = String(b.branchName || b.BranchName || b.name || b.Name || "");
          if (id && id !== 0 && name && !branchMap.has(id)) {
            branchMap.set(id, name);
          }
        });
      }
      return Array.from(branchMap.entries()).map(([id, name]) => ({ id, name }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load global branches';
      return rejectWithValue(msg);
    }
  }
);

const masterDataSlice = createSlice({
  name: 'masterData',
  initialState,
  reducers: {
    clearMasterData: (state) => {
      state.data = null;
      state.branches = [];
      state.error = null;
    },
    setMasterBranches: (state, action: { payload: BranchItem[] }) => {
      state.branches = action.payload;
    },
    addMasterBranch: (state, action: { payload: BranchItem }) => {
      if (!state.branches.some((b) => b.id === action.payload.id)) {
        state.branches.push(action.payload);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGlobalMasterData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGlobalMasterData.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload.pMaster;
        const map = new Map<number, string>();
        (action.payload.branches || []).forEach((b) => map.set(b.id, b.name));
        (state.branches || []).forEach((b) => {
          if (!map.has(b.id) && b.id !== 0) {
            map.set(b.id, b.name);
          }
        });
        state.branches = Array.from(map.entries()).map(([id, name]) => ({ id, name }));
      })
      .addCase(fetchGlobalMasterData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchGlobalBranches.fulfilled, (state, action) => {
        const map = new Map<number, string>();
        (action.payload || []).forEach((b) => map.set(b.id, b.name));
        (state.branches || []).forEach((b) => {
          if (!map.has(b.id) && b.id !== 0) {
            map.set(b.id, b.name);
          }
        });
        state.branches = Array.from(map.entries()).map(([id, name]) => ({ id, name }));
      });
  },
});

export const { clearMasterData, setMasterBranches, addMasterBranch } = masterDataSlice.actions;
export default masterDataSlice.reducer;
