import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { 
  POS_TENDER_OPTIONS, 
  POS_INITIAL_CART 
} from '../../constants';
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../../../app/store';
import { calculateLineItem, getBillingConfig } from '../utils/billing';
import type { 
  PosCartItem, 
  MenuGroup, 
  PosCategory, 
  MenuSubCategory, 
  PosProduct,
  PosOrderType
} from '../../types';

interface PosState {
  cartItems: PosCartItem[];
  search: string;
  orderTypes: PosOrderType[];
  selectedOrderTypeId: number;
  selectedOrderTypeName: string;
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

  selectedCustomerId: number;
  selectedAddressId: number;
  selectedSectionId: number;
  selectedTableId: number;
  guestNo: number;
  missedCall: boolean;
  contactNo: string;
  note: string;
  change: string;
  isComing: boolean;
  comingTime: string;
  vehicleCustomerName: string;
  vehicleNo: string;
  editingOrderId: number | null;
  editingSaleId: number | null;
  voidProducts: { productId: number; unitId: number; qty: number; amount: number; mapId: number }[];
  voidModifiers: { mapId: number; modifierId: number; qty: number; amount: number; typeId: number }[];
  isSettledEdit: boolean;
  isSettling: boolean;
  isCartModified: boolean;
  combinedOrderIds: number[];
}

const loadCart = (): PosCartItem[] => {
  return POS_INITIAL_CART;
};

const initialState: PosState = {
  cartItems: loadCart(),
  search: '',
  orderTypes: [],
  selectedOrderTypeId: 1,
  selectedOrderTypeName: "DineIn",
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

  selectedCustomerId: 1, // Default to 1 (General Customer)
  selectedAddressId: 0,
  selectedSectionId: 0,
  selectedTableId: 0,
  guestNo: 0,
  missedCall: false,
  contactNo: '',
  note: '',
  change: '',
  isComing: false,
  comingTime: new Date().toISOString(),
  vehicleCustomerName: '',
  vehicleNo: '',
  editingOrderId: null,
  editingSaleId: null,
  voidProducts: [],
  voidModifiers: [],
  isSettling: false,
  isSettledEdit: false,
  isCartModified: false,
  combinedOrderIds: [],
};

const normalizeOrderTypeName = (value?: string) => (value || "").toLowerCase().replace(/[\s_-]/g, "");

const fallbackOrderTypeByName = (name: string): PosOrderType => {
  const normalized = normalizeOrderTypeName(name);
  if (normalized.includes("takeout") || normalized.includes("takeaway")) return { orderTypeId: 2, orderType: "TakeOut" };
  if (normalized.includes("drive")) return { orderTypeId: 3, orderType: "DriveThru" };
  if (normalized.includes("delivery")) return { orderTypeId: 4, orderType: "Delivery" };
  return { orderTypeId: 1, orderType: "DineIn" };
};

const posSlice = createSlice({
  name: 'pos',
  initialState,
    reducers: {
    addToCart: (state, action: PayloadAction<{ uniqueId: string; productId: number; variantName?: string; price?: number; isIncl?: boolean }>) => {
      state.isCartModified = true;
      const { uniqueId, productId, variantName, price, isIncl } = action.payload;
      const existing = state.cartItems.find(item => item.uniqueId === uniqueId);
      if (existing) {
        existing.quantity += 1;
      } else {
        state.cartItems.push({
          uniqueId,
          productId,
          quantity: 1,
          variantName,
          price: price ?? 0,
          isIncl
        });
      }
    },
    incrementItem: (state, action: PayloadAction<{ uniqueId: string }>) => {
      state.isCartModified = true;
      const { uniqueId } = action.payload;
      const item = state.cartItems.find(i => i.uniqueId === uniqueId);
      if (item) {
        item.quantity += 1;
      }
    },
    decrementItem: (state, action: PayloadAction<{ uniqueId: string }>) => {
      state.isCartModified = true;
      const { uniqueId } = action.payload;
      const item = state.cartItems.find(i => i.uniqueId === uniqueId);
      if (item) {
        if (item.quantity > 1) {
          item.quantity -= 1;
        } else {
          state.cartItems = state.cartItems.filter(i => i.uniqueId !== uniqueId);
        }
      }
    },
    removeFromCart: (state, action: PayloadAction<{ uniqueId: string }>) => {
      state.isCartModified = true;
      const { uniqueId } = action.payload;
      state.cartItems = state.cartItems.filter(i => i.uniqueId !== uniqueId);
    },
    clearCart: (state) => {
      state.cartItems = [];
      state.editingOrderId = null;
      state.editingSaleId = null;
      state.voidProducts = [];
      state.voidModifiers = [];
      state.isSettledEdit = false;
      state.isCartModified = false;
      state.isSettling = false;
      state.combinedOrderIds = [];
      state.billDiscountValue = 0;
      state.selectedCustomerId = 1;
      state.selectedAddressId = 0;
      state.selectedSectionId = 0;
      state.selectedTableId = 0;
      state.guestNo = 0;
      state.missedCall = false;
      state.contactNo = '';
      state.note = '';
      state.change = '';
      state.isComing = false;
      state.comingTime = new Date().toISOString();
      state.vehicleCustomerName = '';
      state.vehicleNo = '';
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
    setOrderTypes: (state, action: PayloadAction<PosOrderType[]>) => {
      state.orderTypes = action.payload;
      const selectedTypeExists = action.payload.some((type) => type.orderTypeId === state.selectedOrderTypeId);
      if ((!state.selectedOrderTypeId || !selectedTypeExists) && action.payload.length > 0) {
        // Try to recover the selection by name before giving up and defaulting to index 0
        const currentNameNorm = normalizeOrderTypeName(state.selectedOrderTypeName || "");
        const matchByName = action.payload.find(
          (type) => normalizeOrderTypeName(type.orderType) === currentNameNorm
        );

        if (matchByName) {
          state.selectedOrderTypeId = matchByName.orderTypeId;
          state.selectedOrderTypeName = matchByName.orderType;
        } else {
          state.selectedOrderTypeId = action.payload[0].orderTypeId;
          state.selectedOrderTypeName = action.payload[0].orderType;
        }
      }
    },
    setOrderType: (state, action: PayloadAction<PosOrderType>) => {
      state.selectedOrderTypeId = action.payload.orderTypeId;
      state.selectedOrderTypeName = action.payload.orderType;
    },
    setOrderTypeByName: (state, action: PayloadAction<string>) => {
      const normalized = normalizeOrderTypeName(action.payload);
      const match = state.orderTypes.find((type) => normalizeOrderTypeName(type.orderType) === normalized);
      const type = match ?? fallbackOrderTypeByName(action.payload);
      state.selectedOrderTypeId = type.orderTypeId;
      state.selectedOrderTypeName = type.orderType;
    },
    setEditingOrder: (state, action: PayloadAction<{ orderId: number; orderType: string; isSettledEdit?: boolean; customerId?: number; employeeId?: number }>) => {
      state.editingOrderId = action.payload.orderId;
      state.isSettledEdit = action.payload.isSettledEdit || false;
      const ot = fallbackOrderTypeByName(action.payload.orderType);
      state.selectedOrderTypeId = ot.orderTypeId;
      state.selectedOrderTypeName = ot.orderType;
      if (action.payload.customerId) {
        state.selectedCustomerId = action.payload.customerId;
      }
      state.combinedOrderIds = [];
    },
    setCombinedOrderIds: (state, action: PayloadAction<number[]>) => {
      state.combinedOrderIds = action.payload;
    },
    setTenderOption: (state, action: PayloadAction<string>) => {
      state.selectedTender = action.payload;
    },

    // Discount Reducers
    setBillDiscount: (state, action: PayloadAction<{ value: number; type: 'percentage' | 'amount' }>) => {
      state.isCartModified = true;
      state.billDiscountValue = action.payload.value;
      state.billDiscountType = action.payload.type;
    },
    setItemDiscount: (state, action: PayloadAction<{ uniqueId: string; value: number; type: 'percentage' | 'amount' }>) => {
      state.isCartModified = true;
      const { uniqueId, value, type } = action.payload;
      const item = state.cartItems.find(i => i.uniqueId === uniqueId);
      if (item) {
        item.discountValue = value;
        item.discountType = type;
      }
    },
    setAllItemsDiscount: (state, action: PayloadAction<{ value: number; type: 'percentage' | 'amount' }>) => {
      state.isCartModified = true;
      const { value, type } = action.payload;
      state.cartItems.forEach(item => {
        item.discountValue = value;
        item.discountType = type;
      });
    },
    updateItemPrice: (state, action: PayloadAction<{ uniqueId: string; price: number }>) => {
      state.isCartModified = true;
      const { uniqueId, price } = action.payload;
      const item = state.cartItems.find(i => i.uniqueId === uniqueId);
      if (item) {
        item.price = price;
      }
    },
    updateItemQty: (state, action: PayloadAction<{ uniqueId: string; quantity: number }>) => {
      state.isCartModified = true;
      const { uniqueId, quantity } = action.payload;
      const item = state.cartItems.find(i => i.uniqueId === uniqueId);
      if (item) {
        item.quantity = Math.max(1, quantity);
      }
    },
    setItemCustomizations: (state, action: PayloadAction<{ 
      uniqueId: string; 
      extras?: { id: number; name: string; price: number; qty: number; typeId: number }[];
      modifiers?: { id: number; name: string; qty: number; typeId: number }[];
    }>) => {
      state.isCartModified = true;
      const { uniqueId, extras, modifiers } = action.payload;
      const item = state.cartItems.find(i => i.uniqueId === uniqueId);
      if (item) {
        item.extras = extras;
        item.modifiers = modifiers;
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
    setCustomerId: (state, action: PayloadAction<number>) => {
      state.selectedCustomerId = action.payload;
    },
    setAddressId: (state, action: PayloadAction<number>) => {
      state.selectedAddressId = action.payload;
    },
    setSectionId: (state, action: PayloadAction<number>) => {
      state.selectedSectionId = action.payload;
    },
    setTableId: (state, action: PayloadAction<number>) => {
      state.selectedTableId = action.payload;
    },
    setGuestNo: (state, action: PayloadAction<number>) => {
      state.guestNo = action.payload;
    },
    setMissedCall: (state, action: PayloadAction<boolean>) => {
      state.missedCall = action.payload;
    },
    setContactNo: (state, action: PayloadAction<string>) => {
      state.contactNo = action.payload;
    },
    setNote: (state, action: PayloadAction<string>) => {
      state.note = action.payload;
    },
    setChange: (state, action: PayloadAction<string>) => {
      state.change = action.payload;
    },
    setIsComing: (state, action: PayloadAction<boolean>) => {
      state.isComing = action.payload;
    },
    setComingTime: (state, action: PayloadAction<string>) => {
      state.comingTime = action.payload;
    },
    setVehicleCustomerName: (state, action: PayloadAction<string>) => {
      state.vehicleCustomerName = action.payload;
    },
    setVehicleNo: (state, action: PayloadAction<string>) => {
      state.vehicleNo = action.payload;
    },
    loadRecalledOrder: (state, action: PayloadAction<{
      editingOrderId?: number | null;
      editingSaleId?: number | null;
      cartItems: PosCartItem[];
      orderTypeId: number;
      orderTypeName: string;
      customerId: number;
      addressId: number;
      billDiscountValue: number;
      billDiscountType: 'percentage' | 'amount';
      sectionId?: number;
      tableId?: number;
      isSettling?: boolean;
      isSettledEdit?: boolean;
    }>) => {
      const { 
        editingOrderId, 
        editingSaleId,
        cartItems, 
        orderTypeId, 
        orderTypeName, 
        customerId, 
        addressId, 
        billDiscountValue, 
        billDiscountType,
        sectionId,
        tableId,
        isSettling,
        isSettledEdit
      } = action.payload;
      state.editingOrderId = editingOrderId ?? null;
      state.editingSaleId = editingSaleId ?? null;
      state.isSettling = isSettling ?? false;
      state.isSettledEdit = isSettledEdit ?? false;
      state.isCartModified = false;
      state.voidProducts = [];
      state.voidModifiers = [];
      state.cartItems = cartItems;
      state.selectedOrderTypeId = orderTypeId;
      state.selectedOrderTypeName = orderTypeName;
      state.selectedCustomerId = customerId;
      state.selectedAddressId = addressId;
      state.billDiscountValue = billDiscountValue;
      state.billDiscountType = billDiscountType;
      state.selectedSectionId = sectionId ?? 0;
      state.selectedTableId = tableId ?? 0;
    },
    addVoidProduct: (state, action: PayloadAction<{ productId: number; productName?: string; unitId: number; qty: number; amount: number; mapId: number }>) => {
      state.isCartModified = true;
      state.voidProducts.push(action.payload);
    },
    addVoidModifier: (state, action: PayloadAction<{ mapId: number; modifierId: number; qty: number; amount: number; typeId?: number }>) => {
      state.isCartModified = true;
      state.voidModifiers.push({ ...action.payload, typeId: action.payload.typeId || 1 });
    },
    setIsSettling: (state, action: PayloadAction<boolean>) => {
      state.isSettling = action.payload;
    },
    clearAllItemDiscounts: (state) => {
      state.isCartModified = true;
      state.cartItems = state.cartItems.map(item => ({
        ...item,
        discountValue: 0,
        discountType: 'amount'
      }));
    },
  },
});

export const {
  addToCart,
  incrementItem,
  decrementItem,
  removeFromCart,
  clearCart,
  addVoidProduct,
  addVoidModifier,
  setCategory,
  setSearch,
  setOrderTypes,
  setOrderType,
  setOrderTypeByName,
  setEditingOrder,
  setTenderOption,
  setBillDiscount,
  setItemDiscount,
  setAllItemsDiscount,
  clearAllItemDiscounts,
  updateItemPrice,
  updateItemQty,
  setItemCustomizations,
  setGroups,
  setGroup,
  setCategories,
  setSubCategories,
  setSubCategory,
  setProducts,
  setLoading,
  setError,
  setCustomerId,
  setAddressId,
  setSectionId,
  setTableId,
  setGuestNo,
  setMissedCall,
  setContactNo,
  setNote,
  setChange,
  setIsComing,
  setComingTime,
  setVehicleCustomerName,
  setVehicleNo,
  loadRecalledOrder,
  setIsSettling,
  setCombinedOrderIds
} = posSlice.actions;

// ─── Selectors ──────────────────────────────────────────────────────────────

export const selectPosState = (state: RootState) => state.pos;

export const selectCartDetails = createSelector(
  [selectPosState],
  (pos) => {
    const config = getBillingConfig(pos.selectedOrderTypeName);

    // FIRST PASS: Calculate total gross amount to determine bill discount proportions
    let totalGross = 0;
    const itemsPreCalc = pos.cartItems.map((item: PosCartItem) => {
      const product = pos.productCache[item.productId] || item.product;
      if (!product) return null;
      
      const price = Number(item.price ?? product.price ?? 0);
      const totalExtrasForLine = (item.extras || []).reduce((sum, extra) => {
        const p = parseFloat(String(extra.price)) || 0;
        const q = parseFloat(String(extra.qty)) || 1;
        return sum + (p * q);
      }, 0);
      
      const itemGross = (price * Number(item.quantity)) + totalExtrasForLine;
      totalGross += itemGross;

      return {
        item,
        product,
        price,
        totalExtrasForLine,
        itemGross
      };
    }).filter((x): x is NonNullable<typeof x> => x !== null);

    // Calculate global Bill Discount
    let globalBillDiscount = 0;
    if (pos.billDiscountValue) {
      if (pos.billDiscountType === 'percentage') {
        globalBillDiscount = (totalGross * pos.billDiscountValue) / 100;
      } else {
        globalBillDiscount = pos.billDiscountValue;
      }
    }

    // SECOND PASS: Distribute discount and calculate line items
    return itemsPreCalc.map(({ item, product, price, totalExtrasForLine, itemGross }) => {
      const displayName = item.variantName ? `${product.name} - ${item.variantName}` : product.name;
      
      let itemDiscount = 0;
      if (globalBillDiscount > 0 && totalGross > 0) {
        // Proportional distribution of bill discount
        itemDiscount = (itemGross / totalGross) * globalBillDiscount;
      } else if (item.discountValue) {
        // Use individual item discount if no bill discount exists
        if (item.discountType === 'percentage') {
          itemDiscount = (itemGross * item.discountValue) / 100;
        } else {
          itemDiscount = item.discountValue;
        }
      }

      const calcs = calculateLineItem(item.quantity, price, itemDiscount, totalExtrasForLine, config, product.vatValue, item.isIncl);

      return {
        ...item,
        product: {
          ...product,
          name: displayName,
          price: price
        },
        extrasTotal: totalExtrasForLine,
        itemDiscount,
        baseAmount: calcs.baseAmount,
        amount: calcs.amount,
        netValue: calcs.netValue,
        sc: calcs.sc,
        levy: calcs.levy,
        vatAmount: calcs.vatAmount,
        vatRate: (product.vatValue || config.vatRate * 100),
        lineTotal: calcs.lineNetAmount
      };
    });
  }
);

export const selectBaseSubtotal = createSelector(
  [selectCartDetails],
  (details) => details.reduce((sum, item) => sum + item.baseAmount, 0)
);

export const selectSubtotal = createSelector(
  [selectCartDetails],
  (details) => details.reduce((sum, item) => sum + item.amount, 0)
);

export const selectItemTotalDiscount = createSelector(
  [selectCartDetails, selectPosState],
  (details, pos) => pos.billDiscountValue > 0 ? 0 : details.reduce((sum, item) => sum + item.itemDiscount, 0)
);

export const selectBillDiscount = createSelector(
  [selectCartDetails, selectPosState],
  (details, pos) => pos.billDiscountValue > 0 ? details.reduce((sum, item) => sum + item.itemDiscount, 0) : 0
);

export const selectDiscount = createSelector(
  [selectSubtotal, selectItemTotalDiscount, selectBillDiscount],
  (subtotal, itemDisc, billDisc) => Math.min(subtotal, itemDisc + billDisc)
);

export const selectTotalExtras = createSelector(
  [selectCartDetails],
  (details) => details.reduce((sum, item) => sum + item.extrasTotal, 0)
);

export const selectCharges = createSelector(
  [selectCartDetails],
  (details) => details.reduce((sum, item) => sum + item.sc + item.levy, 0)
);

export const selectTotalServiceCharge = createSelector(
  [selectCartDetails],
  (details) => details.reduce((sum, item) => sum + item.sc, 0)
);

export const selectTotalLevy = createSelector(
  [selectCartDetails],
  (details) => details.reduce((sum, item) => sum + item.levy, 0)
);

export const selectTax = createSelector(
  [selectCartDetails, selectPosState],
  (details, pos) => {
    const config = getBillingConfig(pos.selectedOrderTypeName);
    if (config.vatType === 'Inclusive') return 0;
    
    return details.reduce((sum, item) => sum + item.vatAmount, 0);
  }
);

export const selectTotal = createSelector(
  [selectSubtotal, selectDiscount, selectCharges, selectTax],
  (subtotal, discount, charges, tax) => {
    return (subtotal - discount) + charges + tax;
  }
);

export const selectItemCount = createSelector(
  [(state: RootState) => state.pos.cartItems],
  (items) => items.reduce((sum: number, item: PosCartItem) => sum + item.quantity, 0)
);

export default posSlice.reducer;
