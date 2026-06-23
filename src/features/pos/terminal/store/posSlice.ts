import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { 
  POS_TENDER_OPTIONS, 
  POS_INITIAL_CART 
} from '../../constants';
import type { 
  PosCartItem, 
  PosOrderType,
  PosProduct
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

  // Custom Delivery Charge Override (selected from multiDeliveryCharges)
  customDeliveryCharge: number | null;

  // Dynamic Menu Data
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
  selectedTableNo: string;
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

  customDeliveryCharge: null,

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
  selectedTableNo: '',
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
    addToCart: (state, action: PayloadAction<{ 
      uniqueId: string; 
      productId: number; 
      variantName?: string; 
      price?: number; 
      isIncl?: boolean;
      discountValue?: number;
      discountType?: 'percentage' | 'amount';
    }>) => {
      state.isCartModified = true;
      const { uniqueId, productId, variantName, price, isIncl, discountValue, discountType } = action.payload;
      const existing = state.cartItems.find(item => item.uniqueId === uniqueId);
      if (existing) {
        existing.quantity += 1;
        if (discountValue !== undefined) {
          existing.discountValue = discountValue;
          existing.discountType = discountType;
        }
      } else {
        state.cartItems.push({
          uniqueId,
          productId,
          quantity: 1,
          variantName,
          price: price ?? 0,
          isIncl,
          discountValue,
          discountType
        });
      }
    },
    cacheProducts: (state, action: PayloadAction<PosProduct[]>) => {
      action.payload.forEach(product => {
        state.productCache[product.id] = product;
      });
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
      state.selectedTableNo = '';
      state.guestNo = 0;
      state.missedCall = false;
      state.contactNo = '';
      state.note = '';
      state.change = '';
      state.isComing = false;
      state.comingTime = new Date().toISOString();
      state.vehicleCustomerName = '';
      state.vehicleNo = '';
      state.customDeliveryCharge = null;
    },
    setCategory: (state, action: PayloadAction<number | null>) => {
      state.activeCategoryId = action.payload;
      state.activeSubCategoryId = null; // reset subcat on cat change
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
    setGroup: (state, action: PayloadAction<number | null>) => {
      state.activeGroupId = action.payload;
      state.activeCategoryId = null; // reset hierarchy
      state.activeSubCategoryId = null;
    },

    setSubCategory: (state, action: PayloadAction<number | null>) => {
      state.activeSubCategoryId = action.payload;
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
    setTableNo: (state, action: PayloadAction<string>) => {
      state.selectedTableNo = action.payload;
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
    setCustomDeliveryCharge: (state, action: PayloadAction<number | null>) => {
      state.customDeliveryCharge = action.payload;
    },
  },
});

export const {
  addToCart,
  cacheProducts,
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
  setGroup,
  setSubCategory,
  setLoading,
  setError,
  setCustomerId,
  setAddressId,
  setSectionId,
  setTableId,
  setTableNo,
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
  setCombinedOrderIds,
  setCustomDeliveryCharge
} = posSlice.actions;

export default posSlice.reducer;
