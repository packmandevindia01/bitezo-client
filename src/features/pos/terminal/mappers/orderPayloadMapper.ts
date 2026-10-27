import {
  roundCalc,
  CALC_PRECISION,
  getBillingConfig,
  getVatStatus,
  getTaxExclusivePrice,
  getTaxExclusiveExtraPrice,
  sanitizeTaxExclusiveDetail,
} from "../utils/billing";
import { formatDateOnly } from "./invoicePayloadMapper";
import type {
  PosCartItem,
  MenuOrderRequest,
  MenuOrderUpdateRequest,
  MenuOrderDetail,
  MenuOrderModifier,
} from "../../types";

export interface OrderSessionParams {
  dayId?: number;
  shiftId?: number;
  userId?: number;
  employeeId?: number;
  customerId?: number;
  providerId?: number;
  providerOrderNo?: string;
  transDate?: string;
}

export interface OrderFormContext {
  cartDetails: PosCartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  charges: number;
  totalServiceCharge: number;
  totalLevy: number;
  total: number;
  deliveryCharge: number;

  selectedOrderTypeId: number;
  selectedOrderTypeName: string;
  selectedCustomerId?: number;
  selectedAddressId?: number;
  selectedSectionId?: number;
  selectedTableId?: number;
  selectedTableNo?: string;
  guestNo?: number;
  missedCall?: boolean;
  contactNo?: string;
  callBack?: string;
  note?: string;
  change?: string;
  isComing?: boolean;
  comingTime?: string | null;
  vehicleCustomerName?: string;
  vehicleNo?: string;
  deliveryCustomerName?: string;
  flatNo?: string;
  buildingNo?: string;
  roadNo?: string;
  blockNo?: string;
  area?: string;
  billDiscountType?: 'percentage' | 'amount';
  billDiscountValue?: number;
  editingOrderId?: number | null;
  voidProducts?: { productId: number; unitId: number; qty: number; amount: number; mapId: number }[];
  voidModifiers?: { mapId: number; modifierId: number; qty: number; amount: number; typeId: number }[];
  combinedOrderIds?: number[];
  prevUpdatedAt?: string | null;
}

export interface DirectSettleOrderBase {
  orderId: number;
  customerId: number;
  employeeId: number;
  transDate: string;
  voucherDate?: string;
  discAmount: number;
  discPer: number;
  serviceCharge: number;
  levy: number;
  vatExclAmount: number;
  vatAmount: number;
  netAmount: number;
  deliveryCharge: number;
  updatedAt: string;
  prevUpdatedAt?: string;
  orderTypeId: number;
  sectionId: number;
  tableId: number;
  tableNo: string;
  guestNo: number;
  vehicleCustomerName: string;
  vehicleNo: string;
  customerName?: string;
  deliveryCustomerName?: string;
  flatNo?: string;
  buildingNo?: string;
  roadNo?: string;
  blockNo?: string;
  area?: string;
  addressId: number;
  missedCall: boolean;
  contactNo: string;
  callBack?: string;
  note: string;
  change: string;
  isComing: boolean;
  comingTime: string;
  providerId: number;
  providerOrderNo: string;
  providerNo: string;
  driverId: number;
  details: MenuOrderDetail[];
  modifiers: MenuOrderModifier[];
  voidProducts: { productId: number; unitId: number; qty: number; amount: number; mapId: number }[];
  voidModifiers: { mapId: number; modifierId: number; qty: number; amount: number; typeId: number }[];
  combinedOrderIds: number[];
  complimentaryStatus?: boolean;
  billDiscount?: number;
  billDiscountValue?: number;
  billDiscountType?: 'percentage' | 'amount';
  isBillDiscount?: boolean;
}

/**
 * Pure Mapper: Builds the baseline direct settle / order object from state.
 */
export const buildDirectSettleOrderPayload = (
  context: OrderFormContext,
  session: OrderSessionParams
): DirectSettleOrderBase => {
  const {
    cartDetails,
    totalServiceCharge,
    totalLevy,
    deliveryCharge,
    selectedOrderTypeId,
    selectedOrderTypeName,
    selectedCustomerId,
    selectedAddressId,
    selectedSectionId,
    selectedTableId,
    selectedTableNo,
    guestNo,
    missedCall = false,
    contactNo = "",
    callBack = "",
    note = "",
    change = "",
    isComing = false,
    comingTime,
    vehicleCustomerName,
    vehicleNo,
    deliveryCustomerName,
    flatNo,
    buildingNo,
    roadNo,
    blockNo,
    area,
    billDiscountType = "percentage",
    billDiscountValue = 0,
    editingOrderId,
    voidProducts = [],
    voidModifiers = [],
    combinedOrderIds = [],
    prevUpdatedAt,
  } = context;

  const normalizedTypeName = (selectedOrderTypeName || "").toLowerCase().replace(/[\s_-]/g, "");
  const isTakeOut =
    selectedOrderTypeId === 2 ||
    normalizedTypeName.includes("takeout") ||
    normalizedTypeName.includes("takeaway") ||
    normalizedTypeName.includes("drive") ||
    normalizedTypeName.includes("delivery");
  const isDineIn = !isTakeOut && (selectedOrderTypeId === 1 || normalizedTypeName.includes("dinein"));

  const rawTransDate = session.transDate || localStorage.getItem("transDate") || new Date().toISOString();
  const activeTransDate = rawTransDate.split("T")[0];

  const highestExistingMapId = Math.max(
    0,
    ...cartDetails.map((i) => i.mapId || 0),
    ...voidProducts.map((v) => v.mapId || 0)
  );

  let nextNewMapId = highestExistingMapId + 1;
  const itemsWithMapId = cartDetails.map((item) => ({
    item,
    mapId: item.mapId || nextNewMapId++,
  }));

  const billingConfig = getBillingConfig(selectedOrderTypeName || "DineIn");
  const isVatEnabled = getVatStatus();

  const isOrderBillDiscount = Boolean(
    (billDiscountValue && Number(billDiscountValue) > 0) ||
    (billDiscountType === "percentage" && Number(billDiscountValue) > 0) ||
    Boolean((context as any).complimentaryStatus)
  );

  const details: MenuOrderDetail[] = itemsWithMapId.map(({ item, mapId }) => {
    const taxExclusivePrice = (item.basePrice !== undefined && Number(item.basePrice) > 0)
      ? roundCalc(Number(item.basePrice), CALC_PRECISION)
      : getTaxExclusivePrice(item, billingConfig);

    const qty = Number(item.quantity ?? (item as any).qty ?? 1);
    const lineExclGross = roundCalc(taxExclusivePrice * qty, CALC_PRECISION);

    // Rule: When ONLY bill discount is applied, item-level discAmount and discPer must be 0 in details!
    // If it's an item-level discount, populate that line's discAmount and discPer.
    const hasItemDiscount = !isOrderBillDiscount && Boolean(item.discountValue && Number(item.discountValue) > 0);
    const itemDiscAmount = hasItemDiscount
      ? roundCalc(
          item.itemDiscountAmount ??
          (item as any).itemDiscountExcl ??
          (item.discountType === "amount" ? item.discountValue || 0 : 0),
          CALC_PRECISION
        )
      : 0;
    const itemDiscPer = hasItemDiscount && item.discountType === "percentage"
      ? roundCalc(item.discountValue || 0)
      : 0;

    const rawVatRate = (item.product?.vatValue !== undefined && item.product?.vatValue !== null)
      ? Number(item.product.vatValue)
      : (item.vatRate !== undefined && item.vatRate !== null)
      ? Number(item.vatRate)
      : (billingConfig.vatRate > 1 ? billingConfig.vatRate : billingConfig.vatRate * 100);
    const activeRate = isVatEnabled ? (rawVatRate > 1 ? rawVatRate / 100 : rawVatRate) : 0;

    const lineSc = roundCalc(item.mainSc ?? item.sc ?? 0);
    const lineLevy = roundCalc(item.mainLevy ?? item.levy ?? 0);
    const lineTaxableBase = Math.max(0, lineExclGross - itemDiscAmount + lineSc + lineLevy);
    const lineVat = activeRate > 0 ? roundCalc(lineTaxableBase * activeRate, CALC_PRECISION) : 0;
    const lineNetAmount = roundCalc(lineTaxableBase + lineVat, CALC_PRECISION);

    return {
      productId: item.productId || item.product?.id || 0,
      unitId: item.unitId || item.product?.unitId || 1,
      qty,
      price: taxExclusivePrice,
      basePrice: taxExclusivePrice,
      exclusivePrice: taxExclusivePrice,
      isPriceTaxExclusive: true,
      discPer: itemDiscPer,
      discAmount: itemDiscAmount,
      serviceCharge: lineSc,
      levy: lineLevy,
      vatId: (item.product as any)?.sVatId || (item as any)?.vatId || 1,
      vatAmount: roundCalc(item.mainVatAmount ?? item.vatAmount ?? lineVat),
      netAmount: roundCalc(item.mainNetAmount ?? item.lineNetAmount ?? lineNetAmount),
      mapId,
      complimentaryStatus: Boolean(
        (item.discountType === "percentage" && Number(item.discountValue) === 100) ||
        (item as any).complimentaryStatus
      ),
    };
  });

  const modifiers: MenuOrderModifier[] = itemsWithMapId.flatMap(({ item, mapId }) => {
    const rawVatRate = (item.product?.vatValue !== undefined && item.product?.vatValue !== null)
      ? Number(item.product.vatValue)
      : (item.vatRate !== undefined && item.vatRate !== null)
      ? Number(item.vatRate)
      : (billingConfig.vatRate * 100);
    const effectiveVatRate = isVatEnabled ? rawVatRate : 0;
    const isItemInclusive =
      item.isIncl === true ? true :
      item.isIncl === false ? false :
      billingConfig.vatType === "Inclusive";

    const seenExtraKeys = new Set<string>();
    const extrasRows: any[] = [];
    (item.extras || []).forEach((extra) => {
      const exId = extra.id || 0;
      const key = `${mapId}-${exId}-${String(extra.name || "").trim().toLowerCase()}`;
      if (seenExtraKeys.has(key)) return;
      seenExtraKeys.add(key);

      const exPrice = Number(extra.price) || 0;
      const exQty = Number(extra.qty) || 1;
      const exclExtraPrice = getTaxExclusiveExtraPrice(exPrice, effectiveVatRate, isItemInclusive);
      extrasRows.push({
        mapId,
        modifierId: exId,
        qty: exQty,
        price: exclExtraPrice,
        amount: roundCalc(exclExtraPrice * exQty, CALC_PRECISION),
        typeId: extra.typeId,
      });
    });

    const seenModKeys = new Set<string>();
    const modifierRows: any[] = [];
    (item.modifiers || []).forEach((mod) => {
      const modId = mod.id || (mod as any).modifierId || 0;
      const key = `${mapId}-${modId}-${String(mod.name || "").trim().toLowerCase()}`;
      if (seenModKeys.has(key)) return;
      seenModKeys.add(key);

      modifierRows.push({
        mapId,
        modifierId: modId,
        qty: mod.qty || 1,
        price: 0,
        amount: 0,
        typeId: mod.typeId || 1,
      });
    });

    const seenMsgKeys = new Set<string>();
    const messageRows: any[] = [];
    (item.messages || []).forEach((msg) => {
      const msgName = String(msg.name || "").trim().toLowerCase();
      const key = `${mapId}-${msgName}`;
      if (seenMsgKeys.has(key)) return;
      seenMsgKeys.add(key);

      messageRows.push({
        mapId,
        modifierId: msg.id || 0,
        qty: 1,
        price: 0,
        amount: 0,
        typeId: 1,
      });
    });

    return [...extrasRows, ...modifierRows, ...messageRows];
  });

  const isDeliveryOrder = selectedOrderTypeId === 4 || normalizedTypeName.includes("delivery");
  const isDriveThruOrder = selectedOrderTypeId === 3 || normalizedTypeName.includes("drive");

  const resolvedCustomerName = isDriveThruOrder
    ? vehicleCustomerName || localStorage.getItem("driveThruCustomerName") || ""
    : isDeliveryOrder
    ? deliveryCustomerName || vehicleCustomerName || ""
    : vehicleCustomerName || "";

  const resolvedFlatNo = flatNo || "";
  const resolvedBuildingNo = buildingNo || "";
  const resolvedBlockNo = blockNo || "";
  const resolvedRoadNo = roadNo || "";
  const resolvedArea = area || "";
  const resolvedContactNo = contactNo || "";
  const resolvedCallBack = isDeliveryOrder ? (callBack || "") : "";
  const resolvedAddressId = selectedAddressId || 0;

  const totalModifierGross = modifiers.reduce((sum, m) => sum + Number(m.amount !== undefined ? m.amount : (Number(m.price || 0) * Number(m.qty || 1))), 0);
  const totalDetailGrossExcl = details.reduce((sum, d) => sum + (Number(d.price || 0) * Number(d.qty || 1)), 0);
  const totalGrossExcl = roundCalc(totalDetailGrossExcl + totalModifierGross);

  const isDiscInclusive = billingConfig.discountType === "Inclusive";
  const activeVatRate = billingConfig.vatRate > 0 ? (billingConfig.vatRate > 1 ? billingConfig.vatRate / 100 : billingConfig.vatRate) : 0.10;

  let masterDiscAmount = 0;
  let masterDiscPer = 0;
  let calcVatExcl = 0;

  const lineDiscounts = details.reduce((sum, d) => sum + Number(d.discAmount || 0), 0);

  if (isOrderBillDiscount) {
    if (billDiscountType === "percentage") {
      masterDiscPer = billDiscountValue;
      masterDiscAmount = roundCalc(totalGrossExcl * (billDiscountValue / 100), CALC_PRECISION);
    } else {
      // Amount discount: convert to tax-exclusive if discount calculation is Inclusive
      masterDiscAmount = (isDiscInclusive && isVatEnabled && activeVatRate > 0)
        ? roundCalc(billDiscountValue / (1 + activeVatRate), CALC_PRECISION)
        : roundCalc(billDiscountValue, CALC_PRECISION);
      masterDiscPer = 0;
    }
    calcVatExcl = roundCalc(Math.max(0, totalGrossExcl - masterDiscAmount));
  } else {
    // Only item-level discounts exist:
    // Rule: only add value into masterData discAmount/discPer if it is a bill discount!
    masterDiscAmount = 0;
    masterDiscPer = 0;
    calcVatExcl = roundCalc(Math.max(0, totalGrossExcl - lineDiscounts));
  }

  const isOrderComplimentary = Boolean(
    (billDiscountType === "percentage" && Number(billDiscountValue) === 100) ||
    (context as any).complimentaryStatus ||
    (cartDetails.length > 0 && cartDetails.every((i) => (i.discountType === "percentage" && Number(i.discountValue) === 100) || (i as any).complimentaryStatus))
  );

  const taxableBase = Math.max(0, calcVatExcl + Number(totalServiceCharge || 0) + Number(totalLevy || 0));
  let calcVatAmt = 0;
  if (isVatEnabled && !isOrderComplimentary && activeVatRate > 0) {
    if (isOrderBillDiscount) {
      calcVatAmt = roundCalc(taxableBase * activeVatRate, CALC_PRECISION);
    } else {
      const detailsVat = roundCalc(details.reduce((sum, d) => sum + Number(d.vatAmount || 0), 0));
      const expectedTaxableVat = roundCalc(taxableBase * activeVatRate, CALC_PRECISION);
      calcVatAmt = detailsVat >= expectedTaxableVat ? detailsVat : expectedTaxableVat;
    }
  }

  const netPayable = roundCalc(taxableBase + calcVatAmt + Number(deliveryCharge || 0));

  return {
    orderId: editingOrderId || 0,
    customerId: session.customerId || selectedCustomerId || 1,
    employeeId: session.employeeId ?? session.userId ?? 1,
    transDate: activeTransDate,
    discAmount: masterDiscAmount,
    discPer: masterDiscPer,
    billDiscount: masterDiscAmount,
    billDiscountValue: billDiscountValue,
    billDiscountType: billDiscountType,
    isBillDiscount: isOrderBillDiscount,
    complimentaryStatus: isOrderComplimentary,
    serviceCharge: roundCalc(totalServiceCharge),
    levy: roundCalc(totalLevy),
    vatExclAmount: calcVatExcl,
    vatAmount: calcVatAmt,
    netAmount: netPayable,
    deliveryCharge: roundCalc(Math.max(0, deliveryCharge)),
    updatedAt: new Date().toISOString(),
    orderTypeId: session.providerId ? 5 : (selectedOrderTypeId || 1),
    sectionId: isDineIn ? selectedSectionId || 0 : 0,
    tableId: isDineIn ? selectedTableId || 0 : 0,
    tableNo: isDineIn ? selectedTableNo || "" : "",
    guestNo: guestNo || 0,
    vehicleCustomerName: resolvedCustomerName,
    vehicleNo: isDriveThruOrder
      ? vehicleNo || localStorage.getItem("driveThruVehicleNo") || ""
      : "",
    customerName: resolvedCustomerName,
    deliveryCustomerName: isDeliveryOrder ? resolvedCustomerName : undefined,
    flatNo: resolvedFlatNo,
    buildingNo: resolvedBuildingNo,
    blockNo: resolvedBlockNo,
    roadNo: resolvedRoadNo,
    area: resolvedArea,
    addressId: resolvedAddressId,
    missedCall,
    contactNo: resolvedContactNo,
    callBack: resolvedCallBack,
    note,
    change: isDeliveryOrder ? (change || "") : "",
    isComing,
    comingTime: comingTime || new Date().toISOString(),
    providerId: session.providerId || 0,
    providerOrderNo: session.providerOrderNo || "",
    providerNo: session.providerOrderNo || "",
    driverId: Number(localStorage.getItem("selectedDriverId") || 0),
    details,
    modifiers,
    voidProducts: voidProducts.map((vp) => ({
      productId: Number(vp.productId),
      unitId: Number(vp.unitId || 1),
      qty: Number(vp.qty || 1),
      amount: roundCalc(vp.amount || 0),
      mapId: Number(vp.mapId || 0),
    })),
    voidModifiers: voidModifiers.filter((vm) => !voidProducts.some((vp) => Number(vp.mapId) === Number(vm.mapId))),
    combinedOrderIds,
    prevUpdatedAt:
      prevUpdatedAt ||
      (editingOrderId ? sessionStorage.getItem(`order_prevUpdatedAt_${editingOrderId}`) || undefined : undefined),
  };
};

/**
 * Pure Mapper: Assembles MenuOrderRequest for POST /api/menu/order
 */
export const buildNewOrderPayload = (
  context: OrderFormContext,
  session: OrderSessionParams
): MenuOrderRequest => {
  const base = buildDirectSettleOrderPayload(context, session);
  return {
    voucherDate: formatDateOnly(session.transDate || new Date()),
    customerId: base.customerId,
    employeeId: base.employeeId,
    dayId: session.dayId || 1,
    shiftId: session.shiftId || 1,
    discAmount: base.discAmount,
    discPer: base.discPer,
    complimentaryStatus: Boolean(base.complimentaryStatus || Number(base.discPer) === 100),
    serviceCharge: base.serviceCharge,
    levy: base.levy,
    vatExclAmount: base.vatExclAmount,
    vatAmount: base.vatAmount,
    netAmount: base.netAmount,
    createdAt: new Date().toISOString(),
    orderTypeId: base.orderTypeId,
    sectionId: base.sectionId,
    tableId: base.tableId,
    guestNo: base.guestNo,
    vehicleCustomerName: base.vehicleCustomerName || "",
    vehicleNo: base.vehicleNo || "",
    addressId: base.addressId,
    missedCall: base.missedCall,
    contactNo: base.contactNo || "",
    callBack: base.callBack || "",
    note: base.note || "",
    change: base.change || "",
    isComing: base.isComing,
    comingTime: base.comingTime || new Date().toISOString(),
    providerNo: base.providerNo || "",
    deliveryCharge: base.deliveryCharge,
    details: base.details,
    modifiers: base.modifiers,
  };
};

/**
 * Pure Mapper: Assembles MenuOrderUpdateRequest for PUT /api/menu/order/{id}
 * Strictly conforms to UpdateKotOrderDto schema (no extra/unmapped properties).
 */
export const buildUpdateOrderPayload = (
  orderId: number,
  context: OrderFormContext,
  session: OrderSessionParams
): MenuOrderUpdateRequest => {
  const base = buildDirectSettleOrderPayload(context, session);
  const resolvedPrevUpdatedAt =
    context.prevUpdatedAt ||
    base.prevUpdatedAt ||
    sessionStorage.getItem(`order_prevUpdatedAt_${orderId}`) ||
    undefined;

  const billingConfig = getBillingConfig(session.providerId ? "Provider" : "DineIn");
  const cleanedDetails: MenuOrderDetail[] = base.details.map((d) => {
    const sanitized = sanitizeTaxExclusiveDetail(d, billingConfig);
    return {
      productId: Number(sanitized.productId),
      unitId: Number(sanitized.unitId || 1),
      qty: Number(sanitized.qty || 1),
      price: sanitized.price,
      discPer: roundCalc(sanitized.discPer || 0),
      discAmount: roundCalc(sanitized.discAmount || 0),
      serviceCharge: roundCalc(sanitized.serviceCharge || 0),
      levy: roundCalc(sanitized.levy || 0),
      vatId: Number(sanitized.vatId || 1),
      vatAmount: roundCalc(sanitized.vatAmount || 0),
      netAmount: sanitized.netAmount,
      mapId: Number(sanitized.mapId || 1),
      complimentaryStatus: Boolean(sanitized.complimentaryStatus),
    };
  });

  const cleanedModifiers: MenuOrderModifier[] = (base.modifiers || []).map((m) => ({
    mapId: Number(m.mapId || 1),
    modifierId: Number(m.modifierId || 0),
    qty: Number(m.qty || 1),
    price: roundCalc(m.price || 0, CALC_PRECISION),
    amount: roundCalc(m.amount || 0, CALC_PRECISION),
    typeId: Number(m.typeId || 1),
  }));

  const cleanedVoidProducts = (base.voidProducts || []).map((vp) => ({
    productId: Number(vp.productId),
    unitId: Number(vp.unitId || 1),
    qty: Number(vp.qty || 1),
    amount: roundCalc(vp.amount || 0),
    mapId: Number(vp.mapId !== undefined && vp.mapId !== null ? vp.mapId : 1),
  }));

  const cleanedVoidModifiers = (base.voidModifiers || []).map((vm) => ({
    mapId: Number(vm.mapId !== undefined && vm.mapId !== null ? vm.mapId : 1),
    modifierId: Number(vm.modifierId || 0),
    qty: Number(vm.qty || 1),
    amount: roundCalc(vm.amount || 0),
    typeId: Number(vm.typeId || 1),
  }));

    return {
    orderId: Number(orderId),
    customerId: Number(base.customerId || 1),
    employeeId: Number(base.employeeId || 1),
    discAmount: roundCalc(base.discAmount || 0),
    discPer: roundCalc(base.discPer || 0),
    complimentaryStatus: Boolean(base.complimentaryStatus || Number(base.discPer) === 100),
    serviceCharge: roundCalc(base.serviceCharge || 0),
    levy: roundCalc(base.levy || 0),
    vatExclAmount: base.vatExclAmount,
    vatAmount: base.vatAmount,
    netAmount: roundCalc(base.netAmount || 0),
    updatedAt: new Date().toISOString(),
    prevUpdatedAt: resolvedPrevUpdatedAt || new Date().toISOString(),
    orderTypeId: Number(base.orderTypeId || 1),
    sectionId: Number(base.sectionId || 0),
    tableId: Number(base.tableId || 0),
    guestNo: Number(base.guestNo || 0),
    vehicleCustomerName: base.vehicleCustomerName || "",
    vehicleNo: base.vehicleNo || "",
    addressId: Number(base.addressId || 0),
    missedCall: Boolean(base.missedCall),
    contactNo: base.contactNo || "",
    note: base.note || "",
    change: base.change || "",
    isComing: Boolean(base.isComing),
    comingTime: base.comingTime || new Date().toISOString(),
    providerNo: base.providerNo || "",
    deliveryCharge: roundCalc(base.deliveryCharge || 0),
    driverId: Number(base.driverId || 0),
    details: cleanedDetails,
    modifiers: cleanedModifiers,
    voidProducts: cleanedVoidProducts,
    voidModifiers: cleanedVoidModifiers,
    combinedOrderIds: (base.combinedOrderIds || []).map(Number),
  };
};
