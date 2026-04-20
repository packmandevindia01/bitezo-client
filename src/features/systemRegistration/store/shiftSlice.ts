import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { CashierShift } from '../types';

interface ShiftState {
  activeShift: CashierShift | null;
}

const SHIFT_KEY = 'activeShift';

const loadShift = (): CashierShift | null => {
  try {
    const raw = localStorage.getItem(SHIFT_KEY);
    return raw ? (JSON.parse(raw) as CashierShift) : null;
  } catch {
    return null;
  }
};

const initialState: ShiftState = {
  activeShift: loadShift(),
};

const shiftSlice = createSlice({
  name: 'shift',
  initialState,
  reducers: {
    startShift: (state, action: PayloadAction<CashierShift>) => {
      state.activeShift = action.payload;
      localStorage.setItem(SHIFT_KEY, JSON.stringify(action.payload));
    },
    endShift: (state, action: PayloadAction<CashierShift>) => {
      state.activeShift = null; // We clear active but could store history if needed
      localStorage.removeItem(SHIFT_KEY);
      
      // Store shift history safely
      try {
        const history: CashierShift[] = JSON.parse(localStorage.getItem('shiftHistory') ?? '[]');
        history.unshift(action.payload);
        localStorage.setItem('shiftHistory', JSON.stringify(history.slice(0, 20)));
      } catch (err) {
        console.error('Failed to update shift history:', err);
      }
    },
    clearActiveShift: (state) => {
      state.activeShift = null;
      localStorage.removeItem(SHIFT_KEY);
    }
  },
});

export const { startShift, endShift, clearActiveShift } = shiftSlice.actions;

export default shiftSlice.reducer;
