import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/store/authSlice';
import masterDataReducer from '../features/inventory/shared/store/masterDataSlice';
import posReducer from '../features/pos/store/posSlice';
import shiftReducer from '../features/systemRegistration/store/shiftSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    masterData: masterDataReducer,
    pos: posReducer,
    shift: shiftReducer,
  },
  // RTK handles basic middleware automatically, you can add more if needed
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
