import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { 
  POS_CATEGORIES, 
  POS_ORDER_TYPES, 
  POS_TENDER_OPTIONS, 
  POS_INITIAL_CART 
} from '../../constants';
import type { PosCartItem } from '../../types';

interface PosState {
  cartItems: PosCartItem[];
  activeCategoryId: string;
  search: string;
  selectedOrderType: string;
  selectedTender: string;
}

const loadCart = (): PosCartItem[] => {
  try {
    const saved = localStorage.getItem('posCartItems');
    return saved ? JSON.parse(saved) : POS_INITIAL_CART;
  } catch (err) {
    console.warn('Failed to load cart from storage:', err);
    return POS_INITIAL_CART;
  }
};

const initialState: PosState = {
  cartItems: loadCart(),
  activeCategoryId: POS_CATEGORIES[0]?.id ?? '',
  search: '',
  selectedOrderType: POS_ORDER_TYPES[0]?.id ?? '',
  selectedTender: POS_TENDER_OPTIONS[0]?.id ?? '',
};

const posSlice = createSlice({
  name: 'pos',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<number>) => {
      const existing = state.cartItems.find(item => item.productId === action.payload);
      if (existing) {
        existing.quantity += 1;
      } else {
        state.cartItems.push({ productId: action.payload, quantity: 1 });
      }
      localStorage.setItem('posCartItems', JSON.stringify(state.cartItems));
    },
    incrementItem: (state, action: PayloadAction<number>) => {
      const item = state.cartItems.find(i => i.productId === action.payload);
      if (item) {
        item.quantity += 1;
        localStorage.setItem('posCartItems', JSON.stringify(state.cartItems));
      }
    },
    decrementItem: (state, action: PayloadAction<number>) => {
      const item = state.cartItems.find(i => i.productId === action.payload);
      if (item) {
        if (item.quantity > 1) {
          item.quantity -= 1;
        } else {
          state.cartItems = state.cartItems.filter(i => i.productId !== action.payload);
        }
        localStorage.setItem('posCartItems', JSON.stringify(state.cartItems));
      }
    },
    removeFromCart: (state, action: PayloadAction<number>) => {
      state.cartItems = state.cartItems.filter(i => i.productId !== action.payload);
      localStorage.setItem('posCartItems', JSON.stringify(state.cartItems));
    },
    clearCart: (state) => {
      state.cartItems = [];
      localStorage.removeItem('posCartItems');
    },
    setCategory: (state, action: PayloadAction<string>) => {
      state.activeCategoryId = action.payload;
    },
    setSearch: (state, action: PayloadAction<string>) => {
      state.search = action.payload;
    },
    setOrderType: (state, action: PayloadAction<string>) => {
      state.selectedOrderType = action.payload;
    },
    setTenderOption: (state, action: PayloadAction<string>) => {
      state.selectedTender = action.payload;
    },
  },
});

export const {
  addToCart,
  incrementItem,
  decrementItem,
  removeFromCart,
  clearCart,
  setCategory,
  setSearch,
  setOrderType,
  setTenderOption
} = posSlice.actions;

// ─── Selectors ──────────────────────────────────────────────────────────────
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../../../app/store';
import { POS_PRODUCTS } from '../../constants';

const TAX_RATE = 0.05;
const DISCOUNT_RATE = 0.08;

export const selectPosState = (state: RootState) => state.pos;

export const selectCartDetails = createSelector(
  [selectPosState],
  (pos) => {
    return pos.cartItems.map((item: PosCartItem) => {
      const product = POS_PRODUCTS.find(p => p.id === item.productId);
      if (!product) return null;
      return {
        ...item,
        product,
        lineTotal: product.price * item.quantity
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null);
  }
);

export const selectSubtotal = createSelector(
  [selectCartDetails],
  (details) => details.reduce((sum: number, item) => sum + item.lineTotal, 0)
);

export const selectDiscount = createSelector(
  [selectSubtotal],
  (subtotal) => Math.round(subtotal * DISCOUNT_RATE)
);

export const selectTax = createSelector(
  [selectSubtotal, selectDiscount],
  (subtotal, discount) => Math.round((subtotal - discount) * TAX_RATE)
);

export const selectTotal = createSelector(
  [selectSubtotal, selectDiscount, selectTax],
  (subtotal, discount, tax) => (subtotal - discount) + tax
);

export const selectItemCount = createSelector(
  [(state: RootState) => state.pos.cartItems],
  (items) => items.reduce((sum: number, item: PosCartItem) => sum + item.quantity, 0)
);

export default posSlice.reducer;
