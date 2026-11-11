/* eslint-disable @typescript-eslint/no-explicit-any -- print lines carry saved-order rows of many shapes */
/** The result every print template consumes. */
import type { UnifiedExtraModifier, UnifiedStandardModifier, UnifiedMessageModifier } from "./orderLineItems";

export type { UnifiedExtraModifier, UnifiedStandardModifier, UnifiedMessageModifier };

export interface UnifiedOrderLine {
  isUnifiedPricingLine?: boolean;
  mapId?: number;
  isProductMasterInclusive?: boolean;
  productId: number;
  unitId?: number;
  categoryId?: number;
  productName: string;
  productArabicName?: string;
  variantName?: string;
  variantArabic?: string;
  quantity: number;

  // Base unit rates (excluding extras)
  baseExclusiveRate?: number;
  baseInclusiveRate?: number;

  // Dual pre-computed unit rates (including extras)
  exclusiveRate: number;
  inclusiveRate: number;

  // Dual pre-computed gross totals (rate * quantity, before line discount)
  exclusiveGross: number;
  inclusiveGross: number;

  // Dual pre-computed net amounts (rate * quantity - line discount)
  exclusiveAmount: number;
  inclusiveAmount: number;

  // Tax and discount details
  vatRate: number; // percentage (e.g. 10)
  vatAmount: number; // line VAT amount
  lineDiscount: number; // line discount amount
  lineDiscountExcl: number;
  lineDiscountIncl: number;

  // Modifiers
  extras: UnifiedExtraModifier[];
  modifiers: UnifiedStandardModifier[];
  messages: UnifiedMessageModifier[];

  // Convenience helper to get display rate and amount based on tax setting
  getRate: (isInclusive: boolean) => number;
  getAmount: (isInclusive: boolean, isOrderBillDiscount?: boolean) => number;
  getDiscount: (isInclusive: boolean) => number;

  // Original reference item
  rawItem: any;
  [key: string]: any;
}

export interface UnifiedOrderSummary {
  subTotalExclusive: number;
  subTotalInclusive: number;
  lineDiscountsTotal: number;
  lineDiscountsTotalExcl?: number;
  lineDiscountsTotalIncl?: number;
  billDiscountTotal: number;
  billDiscountTotalExcl?: number;
  billDiscountTotalIncl?: number;
  totalDiscount: number;
  totalDiscountExcl?: number;
  totalDiscountIncl?: number;
  taxableBase?: number;
  serviceCharge: number;
  levy: number;
  deliveryCharge: number;
  vatAmount: number;
  grandTotal: number;
  netAmount: number;
  isBillDiscount: boolean;
  isVatActive: boolean;

  charges?: number;
  netValue?: number;
  vatExclAmount?: number;
  printPrice?: string;
  priceView?: string;
  isTaxInclusive?: boolean;

  // Helper to get subtotal and discount matching tax setting
  getSubTotal: (isInclusive: boolean) => number;
  getTotalDiscount: (isInclusive: boolean) => number;
  [key: string]: any;
}

export interface UnifiedOrderPricingResult {
  lines: UnifiedOrderLine[];
  summary: UnifiedOrderSummary;
}

export interface BuildUnifiedPricingOptions {
  orderType?: string;
  subTotal?: number;
  netAmount?: number;
  vatAmount?: number;
  discount?: number;
  serviceCharge?: number;
  levy?: number;
  deliveryCharge?: number;
  isBillDiscount?: boolean;
  isVatActive?: boolean;
  printPrice?: "Inclusive" | "Exclusive" | string;
  priceView?: "Inclusive" | "Exclusive" | string;
  modifierTypes?: any[];
  products?: any[];
  productCache?: Record<string | number, any>;
  [key: string]: any;
}
