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
    discount,
    totalServiceCharge,
    totalLevy,
    total,
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

  const details: MenuOrderDetail[] = itemsWithMapId.map(({ item, mapId }) => {
    const mainNetAmount = item.mainNetAmount !== undefined ? item.mainNetAmount : (item.lineTotal || 0);
    const mainVatAmount = item.mainVatAmount !== undefined ? item.mainVatAmount : (item.vatAmount || 0);
    const mainSc = item.mainSc !== undefined ? item.mainSc : (item.sc || 0);
    const mainLevy = item.mainLevy !== undefined ? item.mainLevy : (item.levy || 0);

    const taxExclusivePrice = getTaxExclusivePrice(item, billingConfig);
    const itemDiscAmount = roundCalc(
      item.effectiveDiscountAmount ?? (item.discountType === "amount" ? item.discountValue || 0 : 0)
    );
    // Line netAmount includes tax (net payable amount for this line)
    const lineNetAmount = roundCalc(Math.max(0, mainNetAmount));

    return {
      productId: item.productId || item.product?.id || 0,
      unitId: item.unitId || item.product?.unitId || 1,
      qty: item.quantity,
      price: taxExclusivePrice,
      basePrice: taxExclusivePrice,
      exclusivePrice: taxExclusivePrice,
      isPriceTaxExclusive: true,
      discPer:
        item.discountType === "percentage"
          ? roundCalc(item.discountValue || 0)
          : billDiscountType === "percentage"
          ? billDiscountValue
          : 0,
      discAmount: itemDiscAmount,
      serviceCharge: roundCalc(mainSc),
      levy: roundCalc(mainLevy),
      vatId: (item.product as any)?.sVatId || (item as any)?.vatId || 1,
      vatAmount: roundCalc(Math.max(0, mainVatAmount)),
      netAmount: lineNetAmount,
      mapId,
      complimentaryStatus: Boolean(
        (item.discountType === "percentage" && Number(item.discountValue) === 100) ||
        (billDiscountType === "percentage" && Number(billDiscountValue) === 100) ||
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

  const totalDetailGross = details.reduce((sum, d) => sum + Number(d.price || 0) * Number(d.qty || 1), 0);
  const totalModifierGross = modifiers.reduce((sum, m) => sum + Number(m.amount !== undefined ? m.amount : (Number(m.price || 0) * Number(m.qty || 1))), 0);
  const totalGrossExcl = roundCalc(totalDetailGross + totalModifierGross);
  const lineDiscounts = details.reduce((sum, d) => sum + Number(d.discAmount || 0), 0);
  const totalOrderDiscount = roundCalc(Math.max(0, Number(discount || 0), lineDiscounts));

  return {
    orderId: editingOrderId || 0,
    customerId: session.customerId || selectedCustomerId || 1,
    employeeId: session.employeeId ?? session.userId ?? 1,
    transDate: activeTransDate,
    discAmount: totalOrderDiscount,
    discPer: billDiscountType === "percentage" ? billDiscountValue : 0,
    complimentaryStatus: Boolean(
      (billDiscountType === "percentage" && Number(billDiscountValue) === 100) ||
      (context as any).complimentaryStatus ||
      (cartDetails.length > 0 && cartDetails.every((i) => (i.discountType === "percentage" && Number(i.discountValue) === 100) || (i as any).complimentaryStatus))
    ),
    serviceCharge: roundCalc(totalServiceCharge),
    levy: roundCalc(totalLevy),
    vatExclAmount: roundCalc(Math.max(0, totalGrossExcl - totalOrderDiscount)),
    vatAmount: roundCalc(details.reduce((sum, d) => sum + Number(d.vatAmount || 0), 0)),
    netAmount: roundCalc(Math.max(0, total)),
    deliveryCharge: roundCalc(Math.max(0, deliveryCharge)),
    updatedAt: new Date().toISOString(),
    orderTypeId: session.providerId || selectedOrderTypeId,
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

    const cleanedDetailGross = cleanedDetails.reduce((sum, d) => sum + Number(d.price || 0) * Number(d.qty || 1), 0);
    const cleanedModifierGross = (base.modifiers || []).reduce((sum, m) => sum + Number(m.amount !== undefined ? m.amount : (Number(m.price || 0) * Number(m.qty || 1))), 0);
    const cleanedGrossExcl = roundCalc(cleanedDetailGross + cleanedModifierGross);
    const lineDiscounts = cleanedDetails.reduce((sum, d) => sum + Number(d.discAmount || 0), 0);
    const totalOrderDiscount = roundCalc(Math.max(0, Number(base.discAmount || 0), lineDiscounts));

    return {
    orderId: Number(orderId),
    customerId: Number(base.customerId || 1),
    employeeId: Number(base.employeeId || 1),
    discAmount: totalOrderDiscount,
    discPer: roundCalc(base.discPer || 0),
    complimentaryStatus: Boolean(base.complimentaryStatus || Number(base.discPer) === 100),
    serviceCharge: roundCalc(base.serviceCharge || 0),
    levy: roundCalc(base.levy || 0),
    vatExclAmount: roundCalc(Math.max(0, cleanedGrossExcl - totalOrderDiscount)),
    vatAmount: roundCalc(cleanedDetails.reduce((sum, d) => sum + Number(d.vatAmount || 0), 0)),
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
