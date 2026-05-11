import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { 
  POS_ORDER_TYPES, 
  POS_TENDER_OPTIONS, 
  POS_INITIAL_CART 
} from '../../constants';
import type { 
  PosCartItem, 
  MenuGroup, 
  PosCategory, 
  MenuSubCategory, 
  PosProduct 
} from '../../types';

interface PosState {
  cartItems: PosCartItem[];
  search: string;
  selectedOrderType: string;
  selectedTender: string;

  // Dynamic Menu Data
  groups: MenuGroup[];
  categories: PosCategory[];
  subCategories: MenuSubCategory[];
  products: PosProduct[];
  
  activeGroupId: number | null;
  activeCategoryId: number | null;
  activeSubCategoryId: number | null;
  
  loading: boolean;
  error: string | null;
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
  search: '',
  selectedOrderType: POS_ORDER_TYPES[0]?.id ?? '',
  selectedTender: POS_TENDER_OPTIONS[0]?.id ?? '',
  
  groups: [],
  categories: [],
  subCategories: [],
  products: [],
  
  activeGroupId: null,
  activeCategoryId: null,
  activeSubCategoryId: null,
  
  loading: false,
  error: null,
};

const posSlice = createSlice({
  name: 'pos',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<{ productId: number; variantName?: string; price?: number }>) => {
      const { productId, variantName, price } = action.payload;
      const existing = state.cartItems.find(item => 
        item.productId === productId && item.variantName === variantName
      );
      if (existing) {
        existing.quantity += 1;
      } else {
        state.cartItems.push({ productId, quantity: 1, variantName, price });
      }
      localStorage.setItem('posCartItems', JSON.stringify(state.cartItems));
    },
    incrementItem: (state, action: PayloadAction<{ productId: number; variantName?: string }>) => {
      const { productId, variantName } = action.payload;
      const item = state.cartItems.find(i => 
        i.productId === productId && i.variantName === variantName
      );
      if (item) {
        item.quantity += 1;
        localStorage.setItem('posCartItems', JSON.stringify(state.cartItems));
      }
    },
    decrementItem: (state, action: PayloadAction<{ productId: number; variantName?: string }>) => {
      const { productId, variantName } = action.payload;
      const item = state.cartItems.find(i => 
        i.productId === productId && i.variantName === variantName
      );
      if (item) {
        if (item.quantity > 1) {
          item.quantity -= 1;
        } else {
          state.cartItems = state.cartItems.filter(i => 
            !(i.productId === productId && i.variantName === variantName)
          );
        }
        localStorage.setItem('posCartItems', JSON.stringify(state.cartItems));
      }
    },
    removeFromCart: (state, action: PayloadAction<{ productId: number; variantName?: string }>) => {
      const { productId, variantName } = action.payload;
      state.cartItems = state.cartItems.filter(i => 
        !(i.productId === productId && i.variantName === variantName)
      );
      localStorage.setItem('posCartItems', JSON.stringify(state.cartItems));
    },
    clearCart: (state) => {
      state.cartItems = [];
      localStorage.removeItem('posCartItems');
    },
    setCategory: (state, action: PayloadAction<number | null>) => {
      state.activeCategoryId = action.payload;
      state.activeSubCategoryId = null; // reset subcat on cat change
      state.subCategories = []; // clear subcategories to prevent stale data
      state.products = []; // clear products to prevent stale data
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
    
    // Dynamic Menu Actions
    setGroups: (state, action: PayloadAction<MenuGroup[]>) => {
      state.groups = action.payload;
    },
    setGroup: (state, action: PayloadAction<number | null>) => {
      state.activeGroupId = action.payload;
      state.activeCategoryId = null; // reset hierarchy
      state.activeSubCategoryId = null;
      state.categories = [];
      state.subCategories = [];
      state.products = [];
    },
    setCategories: (state, action: PayloadAction<PosCategory[]>) => {
      state.categories = action.payload;
    },
    setSubCategories: (state, action: PayloadAction<MenuSubCategory[]>) => {
      state.subCategories = action.payload;
    },
    setSubCategory: (state, action: PayloadAction<number | null>) => {
      state.activeSubCategoryId = action.payload;
    },
    setProducts: (state, action: PayloadAction<PosProduct[]>) => {
      state.products = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
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
  setTenderOption,
  setGroups,
  setGroup,
  setCategories,
  setSubCategories,
  setSubCategory,
  setProducts,
  setLoading,
  setError
} = posSlice.actions;

// ─── Selectors ──────────────────────────────────────────────────────────────
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../../../app/store';

const TAX_RATE = 0.05;
const DISCOUNT_RATE = 0.08;

export const selectPosState = (state: RootState) => state.pos;

export const selectCartDetails = createSelector(
  [selectPosState],
  (pos) => {
    return pos.cartItems.map((item: PosCartItem) => {
      const product = pos.products.find(p => p.id === item.productId);
      if (!product) return null;
      const price = item.price ?? product.price;
      const displayName = item.variantName ? `${product.name} - ${item.variantName}` : product.name;
      
      return {
        ...item,
        product: {
          ...product,
          name: displayName,
          price: price
        },
        lineTotal: price * item.quantity
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
