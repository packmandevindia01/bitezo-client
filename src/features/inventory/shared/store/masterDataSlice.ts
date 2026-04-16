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
      const [pMaster, branchList] = await Promise.all([
        productService.loadMasterData(),
        branchApi.fetchBranchNames(),
      ]);

      const branches = branchList.map((b: any) => ({
        id: b.id,
        name: b.branchName,
      }));

      return { pMaster, branches };
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to load global master data');
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
    }
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
        state.branches = action.payload.branches;
      })
      .addCase(fetchGlobalMasterData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearMasterData } = masterDataSlice.actions;
export default masterDataSlice.reducer;
