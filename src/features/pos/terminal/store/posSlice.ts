import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { 
  POS_INITIAL_CART 
} from '../../constants';
import type { 
  PosCartItem, 
  PosOrderType,
  PosProduct
} from '../../types';
import { isItemSeperationEnabled } from '../../services/posConfigApi';

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
  deliveryCustomerName: string;
  flatNo: string;
  buildingNo: string;
  roadNo: string;
  blockNo: string;
  area: string;
  waiterId: number | null;
  waiterName: string | null;
  editingOrderId: number | null;
  editingSaleId: number | null;
  prevUpdatedAt: string | null;
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

const getDefaultInitialOrderType = () => {
  try {
    const stored = localStorage.getItem("posConfigs");
    if (stored) {
      const parsed = JSON.parse(stored);
      const defaultId = Number(parsed?.configs?.defaultOrderTypeId);
      if (defaultId === 2) return { id: 2, name: "TakeOut" };
      if (defaultId === 3) return { id: 3, name: "DriveThru" };
      if (defaultId === 4) return { id: 4, name: "Delivery" };
      if (defaultId === 5) return { id: 5, name: "Providers" };
      if (defaultId === 1) return { id: 1, name: "DineIn" };
    }
  } catch {}
  return { id: 2, name: "TakeOut" };
};

const initialOT = getDefaultInitialOrderType();

const getInitialWaiter = () => {
  try {
    const id = localStorage.getItem("selectedWaiterId");
    const name = localStorage.getItem("selectedWaiterName");
    return {
      id: id && !isNaN(Number(id)) ? Number(id) : null,
      name: name || null,
    };
  } catch {
    return { id: null, name: null };
  }
};

const initialWaiter = getInitialWaiter();

const initialState: PosState = {
  cartItems: loadCart(),
  search: '',
  orderTypes: [],
  selectedOrderTypeId: initialOT.id,
  selectedOrderTypeName: initialOT.name,
  selectedTender: '1',
  
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
  deliveryCustomerName: '',
  flatNo: '',
  buildingNo: '',
  roadNo: '',
  blockNo: '',
  area: '',
  waiterId: initialWaiter.id,
  waiterName: initialWaiter.name,
  editingOrderId: null,
  editingSaleId: null,
  prevUpdatedAt: null,
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
  if (normalized.includes("provider")) return { orderTypeId: 5, orderType: "Providers" };
  if (normalized.includes("coming")) return { orderTypeId: 6, orderType: "Coming" };
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
      quantity?: number;
      variantName?: string; 
      variantArabic?: string;
      price?: number; 
      isIncl?: boolean;
      discountValue?: number;
      discountType?: 'percentage' | 'amount';
      unitId?: number;
      createNewRow?: boolean;
    }>) => {
      state.isCartModified = true;
      const { uniqueId, productId, variantName, variantArabic, price, isIncl, discountValue, discountType, unitId, createNewRow } = action.payload;
      
      const matchVariant = (a?: string, b?: string) => {
        const getNormalizedVariant = (name?: string) => {
          const n = (name || '').toLowerCase().trim();
          if (!n || n === 'main' || n === 'variation') return 'main';
          return n;
        };
        return getNormalizedVariant(a) === getNormalizedVariant(b);
      };

      const hasCustomizations = (item: any): boolean => {
        const hasExtras = Array.isArray(item.extras) && item.extras.length > 0;
        const hasModifiers = Array.isArray(item.modifiers) && item.modifiers.length > 0;
        const hasMessages = Array.isArray(item.messages) && item.messages.length > 0;
        const hasNote = Boolean(item.note || item.notes);
        return hasExtras || hasModifiers || hasMessages || hasNote;
      };

      const isSeparation = createNewRow ?? isItemSeperationEnabled();

      let existing = null;
      if (!isSeparation) {
        existing = state.cartItems.find(
          item =>
            item.uniqueId === uniqueId &&
            !item.isExisting &&
            !item.mapId &&
            !hasCustomizations(item)
        );
        if (!existing) {
          existing = state.cartItems.find(
            item => 
              !item.isExisting &&
              !item.mapId &&
              item.productId === productId && 
              matchVariant(item.variantName, variantName) &&
              Number(item.price) === Number(price ?? 0) &&
              item.isIncl === isIncl &&
              (item.unitId === undefined || unitId === undefined || item.unitId === unitId) &&
              !hasCustomizations(item)
          );
        }
      }

      if (existing) {
        existing.quantity += (action.payload.quantity || 1);
        if (discountValue !== undefined) {
          existing.discountValue = discountValue;
          existing.discountType = discountType;
        }
        if (variantArabic && !existing.variantArabic) {
          existing.variantArabic = variantArabic;
        }
      } else {
        state.cartItems.push({
          uniqueId,
          productId,
          quantity: action.payload.quantity || 1,
          variantName,
          variantArabic,
          price: price ?? 0,
          isIncl,
          discountValue,
          discountType,
          unitId,
          isExisting: false,
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
      state.prevUpdatedAt = null;
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
      state.deliveryCustomerName = '';
      state.flatNo = '';
      state.buildingNo = '';
      state.roadNo = '';
      state.blockNo = '';
      state.area = '';
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

      let defaultId = 1;
      try {
        const stored = localStorage.getItem("posConfigs");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.configs?.defaultOrderTypeId) {
            defaultId = Number(parsed.configs.defaultOrderTypeId);
          }
        }
      } catch {}

      if (!state.selectedOrderTypeId) {
        const matchByDefaultId = action.payload.find((type) => type.orderTypeId === defaultId);
        if (matchByDefaultId) {
          state.selectedOrderTypeId = matchByDefaultId.orderTypeId;
          state.selectedOrderTypeName = matchByDefaultId.orderType;
        } else if (action.payload.length > 0) {
          state.selectedOrderTypeId = action.payload[0].orderTypeId;
          state.selectedOrderTypeName = action.payload[0].orderType;
        }
      } else {
        const selectedTypeExists = action.payload.some((type) => type.orderTypeId === state.selectedOrderTypeId);
        if (!selectedTypeExists && action.payload.length > 0) {
          const matchByDefaultId = action.payload.find((type) => type.orderTypeId === defaultId);
          if (matchByDefaultId) {
            state.selectedOrderTypeId = matchByDefaultId.orderTypeId;
            state.selectedOrderTypeName = matchByDefaultId.orderType;
          } else {
            state.selectedOrderTypeId = action.payload[0].orderTypeId;
            state.selectedOrderTypeName = action.payload[0].orderType;
          }
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
    setEditingOrder: (state, action: PayloadAction<{ orderId: number; orderType: string; isSettledEdit?: boolean; customerId?: number; employeeId?: number; prevUpdatedAt?: string | null }>) => {
      state.editingOrderId = action.payload.orderId;
      state.isSettledEdit = action.payload.isSettledEdit || false;
      state.prevUpdatedAt = action.payload.prevUpdatedAt || null;
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
      if (action.payload && action.payload.length > 0) {
        state.isCartModified = true;
      }
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
      messages?: { id?: number; name: string; qty?: number }[];
    }>) => {
      state.isCartModified = true;
      const { uniqueId, extras, modifiers, messages } = action.payload;
      const item = state.cartItems.find(i => i.uniqueId === uniqueId);
      if (item) {
        if (extras !== undefined) item.extras = extras;
        if (modifiers !== undefined) item.modifiers = modifiers;
        if (messages !== undefined) item.messages = messages;
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
    setDeliveryDetails: (state, action: PayloadAction<{
      customerName?: string;
      contactNo?: string;
      flatNo?: string;
      buildingNo?: string;
      blockNo?: string;
      roadNo?: string;
      area?: string;
      note?: string;
      addressId?: number;
      change?: string;
      isMissedCall?: boolean;
      isComing?: boolean;
    }>) => {
      const p = action.payload;
      if (p.customerName !== undefined) {
        state.deliveryCustomerName = p.customerName;
        state.vehicleCustomerName = p.customerName;
      }
      if (p.contactNo !== undefined) state.contactNo = p.contactNo;
      if (p.flatNo !== undefined) state.flatNo = p.flatNo;
      if (p.buildingNo !== undefined) state.buildingNo = p.buildingNo;
      if (p.blockNo !== undefined) state.blockNo = p.blockNo;
      if (p.roadNo !== undefined) state.roadNo = p.roadNo;
      if (p.area !== undefined) state.area = p.area;
      if (p.note !== undefined) state.note = p.note;
      if (p.addressId !== undefined) state.selectedAddressId = p.addressId;
      if (p.change !== undefined) state.change = p.change;
      if (p.isMissedCall !== undefined) state.missedCall = p.isMissedCall;
      if (p.isComing !== undefined) state.isComing = p.isComing;
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
      providerOrderNo?: string;
      tableId?: number;
      isSettling?: boolean;
      isSettledEdit?: boolean;
      waiterName?: string | null;
      deliveryCharge?: number;
      customDeliveryCharge?: number | null;
      contactNo?: string;
      note?: string;
      change?: string;
      isComing?: boolean;
      comingTime?: string;
      vehicleCustomerName?: string;
      vehicleNo?: string;
      deliveryCustomerName?: string;
      flatNo?: string;
      buildingNo?: string;
      blockNo?: string;
      roadNo?: string;
      area?: string;
      isCartModified?: boolean;
      prevUpdatedAt?: string | null;
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
        isSettledEdit,
        waiterName,
        deliveryCharge,
        customDeliveryCharge,
        contactNo,
        note,
        change,
        isComing,
        comingTime,
        vehicleCustomerName,
        vehicleNo,
        deliveryCustomerName,
        flatNo,
        buildingNo,
        blockNo,
        roadNo,
        area,
        isCartModified,
        prevUpdatedAt,
      } = action.payload;
      state.editingOrderId = editingOrderId ?? null;
      state.editingSaleId = editingSaleId ?? null;
      state.prevUpdatedAt = prevUpdatedAt ?? null;
      state.isSettling = isSettling ?? false;
      state.isSettledEdit = isSettledEdit ?? false;
      state.waiterName = waiterName ?? null;
      state.isCartModified = isCartModified ?? false;
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

      if (deliveryCharge !== undefined) {
        state.customDeliveryCharge = deliveryCharge;
      } else if (customDeliveryCharge !== undefined) {
        state.customDeliveryCharge = customDeliveryCharge;
      }
      if (contactNo !== undefined) state.contactNo = contactNo;
      if (note !== undefined) state.note = note;
      if (change !== undefined) state.change = change;
      if (isComing !== undefined) state.isComing = isComing;
      if (comingTime !== undefined) state.comingTime = comingTime;
      if (vehicleCustomerName !== undefined) state.vehicleCustomerName = vehicleCustomerName;
      if (vehicleNo !== undefined) state.vehicleNo = vehicleNo;
      if (deliveryCustomerName !== undefined) state.deliveryCustomerName = deliveryCustomerName;
      if (flatNo !== undefined) state.flatNo = flatNo;
      if (buildingNo !== undefined) state.buildingNo = buildingNo;
      if (blockNo !== undefined) state.blockNo = blockNo;
      if (roadNo !== undefined) state.roadNo = roadNo;
      if (area !== undefined) state.area = area;
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
    setWaiter: (state, action: PayloadAction<{ waiterId: number | null; waiterName: string | null }>) => {
      state.waiterId = action.payload.waiterId;
      state.waiterName = action.payload.waiterName;
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
  setDeliveryDetails,
  loadRecalledOrder,
  setIsSettling,
  setCombinedOrderIds,
  setCustomDeliveryCharge,
  setWaiter
} = posSlice.actions;

export default posSlice.reducer;
