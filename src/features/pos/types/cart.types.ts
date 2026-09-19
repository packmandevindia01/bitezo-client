export interface PosQuickAction {
  id: string;
  label: string;
}

export interface PosAlternative {
  id?: number;
  altId?: number;
  altName: string;
  altArabic: string;
  isIncl: boolean;
  price: number;
  unitId: number;
  promoPrice?: number;
  promoIsIncl?: boolean;
}

export interface PosExtra {
  id: number;
  name: string;
  arabicName?: string;
  price: number;
  qty?: number;
  typeId?: number;
}

export interface PosExtraType {
  typeId: number;
  typeName: string;
  arabicName?: string;
}

export interface PosModifier {
  id: number;
  name: string;
  arabicName?: string;
  qty?: number;
  typeId?: number;
}

export interface PosModifierType {
  typeId: number;
  typeName: string;
  arabicName?: string;
}

export interface PosCartItem {
  uniqueId: string;
  productId: number;
  quantity: number;
  variantName?: string;
  variantArabic?: string;
  price?: number;
  isIncl?: boolean; // true = price already includes VAT, false = price is exclusive (add VAT on top), undefined = follow global config
  discountValue?: number;
  discountType?: 'percentage' | 'amount';
  unitId?: number;
  extras?: { id: number; name: string; price: number; qty: number; typeId: number }[];
  modifiers?: { id: number; name: string; qty: number; typeId: number }[];
  messages?: { id?: number; name: string; qty?: number }[];
  isExisting?: boolean;
  mapId?: number;
  originalQty?: number;
  product?: {
    id: number;
    name: string;
    arabicName?: string;
    price: number;
    categoryId: number;
    unitId?: number;
    vatValue?: number;
    sVatId?: number;
  };

  // Pre-calculated line fields (7-decimal precision from billing.ts)
  baseAmount?: number;
  extrasTotal?: number;
  amount?: number;
  itemDiscount?: number;
  itemDiscountAmount?: number;
  billDiscountAmount?: number;
  effectiveDiscountAmount?: number;
  netValue?: number;
  sc?: number;
  levy?: number;
  vatBase?: number;
  vatRate?: number;
  vatAmount?: number;
  lineTotal?: number;
  lineNetAmount?: number;
  originalLineTotal?: number;

  mainNetAmount?: number;
  mainVatAmount?: number;
  mainSc?: number;
  mainLevy?: number;
}
