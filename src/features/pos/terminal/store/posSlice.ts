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

  // Discount State
  billDiscountValue: number;
  billDiscountType: 'percentage' | 'amount';

  // Dynamic Menu Data
  groups: MenuGroup[];
  categories: PosCategory[];
  subCategories: MenuSubCategory[];
  products: PosProduct[];
  productCache: Record<number, PosProduct>; // Keep track of all products for cart display
  
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
  
  billDiscountValue: 0,
  billDiscountType: 'percentage',

  groups: [],
  categories: [],
  subCategories: [],
  products: [],
  productCache: {},
  
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
      state.billDiscountValue = 0;
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

    // Discount Reducers
    setBillDiscount: (state, action: PayloadAction<{ value: number; type: 'percentage' | 'amount' }>) => {
      state.billDiscountValue = action.payload.value;
      state.billDiscountType = action.payload.type;
    },
    setItemDiscount: (state, action: PayloadAction<{ productId: number; variantName?: string; value: number; type: 'percentage' | 'amount' }>) => {
      const { productId, variantName, value, type } = action.payload;
      const item = state.cartItems.find(i => i.productId === productId && i.variantName === variantName);
      if (item) {
        item.discountValue = value;
        item.discountType = type;
        localStorage.setItem('posCartItems', JSON.stringify(state.cartItems));
      }
    },
    updateItemPrice: (state, action: PayloadAction<{ productId: number; variantName?: string; price: number }>) => {
      const { productId, variantName, price } = action.payload;
      const item = state.cartItems.find(i => i.productId === productId && i.variantName === variantName);
      if (item) {
        item.price = price;
        localStorage.setItem('posCartItems', JSON.stringify(state.cartItems));
      }
    },
    setItemCustomizations: (state, action: PayloadAction<{ 
      productId: number; 
      variantName?: string; 
      extras?: { id: number; name: string; price: number; qty: number }[];
      modifiers?: { id: number; name: string; qty: number }[];
    }>) => {
      const { productId, variantName, extras, modifiers } = action.payload;
      const item = state.cartItems.find(i => i.productId === productId && i.variantName === variantName);
      if (item) {
        item.extras = extras;
        item.modifiers = modifiers;
        localStorage.setItem('posCartItems', JSON.stringify(state.cartItems));
      }
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
      // Add to cache
      action.payload.forEach(p => {
        state.productCache[p.id] = p;
      });
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
  setBillDiscount,
  setItemDiscount,
  updateItemPrice,
  setItemCustomizations,
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
import { calculateLineItem, getBillingConfig } from '../utils/billing';

export const selectPosState = (state: RootState) => state.pos;

export const selectCartDetails = createSelector(
  [selectPosState],
  (pos) => {
    const config = getBillingConfig(pos.selectedOrderType);

    return pos.cartItems.map((item: PosCartItem) => {
      const product = pos.productCache[item.productId];
      if (!product) return null;
      
      const price = item.price ?? product.price;
      const displayName = item.variantName ? `${product.name} - ${item.variantName}` : product.name;
      
      const extrasTotal = (item.extras || []).reduce((sum, extra) => sum + (extra.price * extra.qty), 0);
      const basePrice = price + extrasTotal;
      const itemGross = basePrice * item.quantity;

      let itemDiscount = 0;
      if (item.discountValue) {
        if (item.discountType === 'percentage') {
          itemDiscount = (itemGross * item.discountValue) / 100;
        } else {
          itemDiscount = item.discountValue;
        }
      }

      const calcs = calculateLineItem(item.quantity, basePrice, itemDiscount, config, product.vatValue);

      return {
        ...item,
        product: {
          ...product,
          name: displayName,
          price: price
        },
        extrasTotal,
        itemDiscount,
        amount: calcs.amount,
        netValue: calcs.netValue,
        sc: calcs.sc,
        levy: calcs.levy,
        vatAmount: calcs.vatAmount,
        vatRate: (product.vatValue || config.vatRate * 100),
        lineTotal: calcs.lineNetAmount
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null);
  }
);

export const selectSubtotal = createSelector(
  [selectCartDetails],
  (details) => details.reduce((sum, item) => sum + item.netValue, 0)
);

export const selectItemTotalDiscount = createSelector(
  [selectCartDetails],
  (details) => details.reduce((sum, item) => sum + item.itemDiscount, 0)
);

export const selectBillDiscount = createSelector(
  [selectSubtotal, selectPosState],
  (subtotal, pos) => {
    if (pos.billDiscountType === 'percentage') {
      return (subtotal * pos.billDiscountValue) / 100;
    }
    return pos.billDiscountValue;
  }
);

export const selectDiscount = createSelector(
  [selectItemTotalDiscount, selectBillDiscount],
  (itemDisc, billDisc) => itemDisc + billDisc
);

export const selectCharges = createSelector(
  [selectCartDetails],
  (details) => details.reduce((sum, item) => sum + item.sc + item.levy, 0)
);

export const selectTax = createSelector(
  [selectCartDetails, selectPosState],
  (details, pos) => {
    const config = getBillingConfig(pos.selectedOrderType);
    if (config.vatType === 'Inclusive') return 0;
    
    return details.reduce((sum, item) => sum + item.vatAmount, 0);
  }
);

export const selectTotal = createSelector(
  [selectSubtotal, selectBillDiscount, selectCharges, selectTax],
  (subtotal, billDisc, charges, tax) => {
    return (subtotal - billDisc) + charges + tax;
  }
);

export const selectItemCount = createSelector(
  [(state: RootState) => state.pos.cartItems],
  (items) => items.reduce((sum: number, item: PosCartItem) => sum + item.quantity, 0)
);

export default posSlice.reducer;
