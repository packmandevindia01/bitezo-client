/* eslint-disable @typescript-eslint/no-explicit-any -- saved orders and cart lines arrive in many shapes */
import { getVatStatus } from "../terminal/utils/billing";
import { checkOrderHasBillDiscount } from "../terminal/utils/orderDiscountCheck";
import { cleanProductName, formatItemDisplayName } from "./alternativeHelpers";
import { extractOrderLineItems, type UnifiedExtraModifier, type UnifiedMessageModifier, type UnifiedStandardModifier } from "./orderLineItems";

export interface OrderShapeOptions {
  isBillDiscount?: boolean;
  isVatActive?: boolean;
  netAmount?: number;
  vatAmount?: number;
  discount?: number;
  modifierTypes?: any[];
  products?: any[];
  productCache?: Record<string | number, any>;
  [key: string]: any;
}

/** What a line is, with no amounts: the amounts come from the stored order or the pricing engine. */
export interface OrderLineShape {
  isUnifiedPricingLine: true;
  productId: number;
  isProductMasterInclusive: boolean;
  unitId: number;
  categoryId: number;
  productName: string;
  productArabicName: string;
  variantName: string;
  variantArabic: string;
  quantity: number;
  extras: UnifiedExtraModifier[];
  modifiers: UnifiedStandardModifier[];
  messages: UnifiedMessageModifier[];
  rawItem: any;
}

interface OrderParts {
  master: any;
  details: any[];
  modifiers: any[];
}

const readOrderParts = (order: any, options?: OrderShapeOptions): OrderParts => {
  if (Array.isArray(order)) return { master: options || {}, details: order, modifiers: [] };
  if (!order || typeof order !== "object") return { master: {}, details: [], modifiers: [] };
  const rawMaster = order.masterData || order.master || order;
  return {
    master: Array.isArray(rawMaster) ? rawMaster[0] || {} : rawMaster || {},
    details: order.detailsData || order.details || [],
    modifiers: order.modifiersData || order.modifiers || [],
  };
};

/** The same extra can only repeat through its own row: exact copies come from SQL joins. */
const dedupeJoinedModifiers = (rows: any[]): any[] => {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const seen = new Set<string>();
  return rows.filter((m: any) => {
    const mapId = m.mapId ?? m.MapId ?? m.mapID ?? 0;
    const modifierId = m.modifierId ?? m.ModifierId ?? m.id ?? m.Id ?? 0;
    const typeId = m.typeId ?? m.TypeId ?? 0;
    const name = String(m.modifierName || m.name || "").trim().toLowerCase();
    const key = `${mapId}-${modifierId}-${typeId}-${name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const lineDiscountOf = (d: any) =>
  Number(d.baseDiscount || d.itemDiscount || d.itemDiscountAmount || d.itemDiscountExcl || d.discountValue || d.discAmount || d.DiscAmount || d.lineDiscount || d.discount || 0);

const masterDiscountOf = (master: any, options?: OrderShapeOptions) =>
  Number(
    master.discAmount ?? master.DiscAmount ?? master.discAmt ?? master.DiscAmt ?? master.discount ?? master.Discount ??
    master.discountAmount ?? master.DiscountAmount ?? master.billDiscount ?? master.BillDiscount ?? master.billDiscountValue ??
    options?.discount ?? 0
  );

/** Whether the order's discount was given on the whole bill rather than on lines. */
export const orderHasBillDiscount = (order: any, options?: OrderShapeOptions): boolean => {
  const { master, details } = readOrderParts(order, options);
  if (options?.isBillDiscount !== undefined) return Boolean(options.isBillDiscount);
  if (master.isBillDiscount !== undefined) return Boolean(master.isBillDiscount);

  const discPer = Number(master.discPer ?? master.DiscPer ?? master.billDiscountPer ?? 0);
  const discount = masterDiscountOf(master, options);
  const complimentary = Boolean(
    master.complimentaryStatus ||
      master.ComplimentaryStatus ||
      discPer === 100 ||
      (details.length > 0 && details.every((d: any) => Boolean(d.complimentaryStatus || d.ComplimentaryStatus || Number(d.discPer ?? d.DiscPer ?? 0) === 100))) ||
      (Number(master.netAmount ?? options?.netAmount ?? 0) === 0 && discount > 0 && details.length > 0)
  );
  const lineDiscounts = details.reduce((sum: number, d: any) => sum + lineDiscountOf(d), 0);
  const hasLineDiscounts = lineDiscounts > 0.001;

  return Boolean(
    complimentary ||
      discPer > 0 ||
      (details.length > 0 && details.some((it: any) => it.billDiscountAmount && it.billDiscountAmount > 0)) ||
      (!hasLineDiscounts && discount > 0.001) ||
      (hasLineDiscounts && discount > lineDiscounts + 0.001) ||
      checkOrderHasBillDiscount({ master, details })
  );
};

/** Whether this order carries VAT: the setting, or VAT stored on the order itself. */
export const orderHasVat = (order: any, options?: OrderShapeOptions): boolean => {
  if (options?.isVatActive !== undefined && options.isVatActive !== null) return Boolean(options.isVatActive);
  const { master, details } = readOrderParts(order, options);
  const storedVat = Number(master.vatAmount ?? master.VatAmount ?? master.vatAmt ?? master.taxAmount ?? options?.vatAmount ?? 0);
  const detailsHaveVat = details.some((d: any) => Number(d.vatAmount ?? d.VatAmount ?? 0) > 0 || Number(d.vatRate ?? d.VatRate ?? d.vatValue ?? d.VatValue ?? 0) > 0);
  const net = Number(master.netAmount ?? master.NetAmount ?? options?.netAmount ?? 0);
  const excl = Number(master.vatExclAmount ?? master.VatExclAmount ?? 0);
  return Boolean(getVatStatus() || storedVat > 0 || detailsHaveVat || (net > 0 && excl > 0 && net - excl > 0.05));
};

/** One shape per line of the order, in order: names, quantity, extras, modifiers, messages. Calculates nothing. */
export const buildOrderLineShapes = (order: any, options?: OrderShapeOptions): OrderLineShape[] => {
  const { details, modifiers } = readOrderParts(order, options);
  const rows = dedupeJoinedModifiers(modifiers);

  return details.map((d: any) => {
    if (d?.isUnifiedPricingLine === true) return d as OrderLineShape;
    const mapId = d.mapId ?? d.MapId ?? d.mapID;
    const itemMods = mapId !== undefined ? rows.filter((m: any) => Number(m.mapId ?? m.MapId ?? m.mapID) === Number(mapId)) : [];
    const { extras, modifiers: lineModifiers, messages } = extractOrderLineItems(d, itemMods, options);

    const productId = Number(d.productId || d.itemId || d.id || 0);
    const product =
      (productId && options?.productCache && options.productCache[productId]) ||
      (productId && Array.isArray(options?.products) && options.products.find((p: any) => p.id === productId)) ||
      d.product ||
      d.Product ||
      null;

    const rawName = d.productName || d.ProductName || d.product?.name || d.itemName || d.ItemName || d.name || `Item #${productId}`;
    const variantName = d.altName || d.variantName || d.AltName || d.VariantName || "";
    const variantArabic = d.altArabic || d.variantArabic || d.AltArabic || d.VariantArabic || "";

    return {
      isUnifiedPricingLine: true,
      productId,
      isProductMasterInclusive: product?.isIncl === true || d.isIncl === true,
      unitId: Number(d.unitId ?? d.UnitId ?? d.product?.unitId ?? 1),
      categoryId: Number(d.categoryId ?? d.CategoryId ?? d.product?.categoryId ?? 0),
      productName: formatItemDisplayName(cleanProductName(rawName, variantName), variantName),
      productArabicName: d.productArabicName || d.productNameAr || d.ProductNameAr || d.arabicName || d.ArabicName || d.product?.arabicName || "",
      variantName,
      variantArabic,
      quantity: Math.max(1, Number(d.qty ?? d.quantity ?? d.Qty ?? d.orderQty ?? d.OrderQty ?? 1)),
      extras,
      modifiers: lineModifiers,
      messages,
      rawItem: d,
    };
  });
};
