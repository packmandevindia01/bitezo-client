import {
  roundCalc,
  CALC_PRECISION,
  getBillingConfig,
  calculateOrder,
  getBillingConfigForOrder,
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
  netValue?: number;
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
  /** Service charge / levy (percent) the order being edited was saved with (same as the cart uses). */
  editingOrderRates?: { serviceCharge: number; levy: number } | null;
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
    tax,
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

  const rawTransDate = (session?.transDate as any) instanceof Date
    ? (session.transDate as any).toISOString()
    : String(session?.transDate || (context as any)?.session?.transDate || localStorage.getItem("transDate") || new Date().toISOString());
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

  const isOrderBillDiscount = Boolean(
    (billDiscountValue && Number(billDiscountValue) > 0) ||
    Boolean((context as any).complimentaryStatus)
  );

  // ── Single pricing pass through the engine (same function the cart screen uses) ──
  // Cart lines carry the price as entered in `catalogPrice` (`price` is the display price).
  const pricingItems = itemsWithMapId.map(({ item }) => ({
    ...item,
    price: (item as any).catalogPrice ?? item.price,
  }));
  const priced = calculateOrder(pricingItems, {
    orderType: selectedOrderTypeName || "DineIn",
    orderTypeId: selectedOrderTypeId,
    billDiscountValue: Number(billDiscountValue) || 0,
    billDiscountType,
    customDeliveryCharge: 0,
    config: getBillingConfigForOrder(selectedOrderTypeName || "DineIn", (context as any).editingOrderRates),
  });

  const details: MenuOrderDetail[] = itemsWithMapId.map(({ item, mapId }, idx) => {
    const line = priced.lines[idx];
    const qty = line.quantity;
    const discAmount = roundCalc(line.billDiscountAmount || line.itemDiscountAmount || 0, CALC_PRECISION);
    const exclusiveUnitPrice = qty > 0 ? roundCalc(line.amount / qty, CALC_PRECISION) : roundCalc(line.amount, CALC_PRECISION);

    let discPer = 0;
    if (line.billDiscountAmount > 0) {
      discPer = billDiscountType === "percentage"
        ? Number(billDiscountValue || 0)
        : (line.amount > 0 ? roundCalc((discAmount / line.amount) * 100, 2) : 0);
    } else if (discAmount > 0 && item.discountType === "percentage") {
      discPer = roundCalc(item.discountValue || 0);
    }

    return {
      productId: item.productId || item.product?.id || 0,
      unitId: item.unitId || item.product?.unitId || 1,
      qty,
      price: exclusiveUnitPrice,
      basePrice: exclusiveUnitPrice,
      exclusivePrice: exclusiveUnitPrice,
      isPriceTaxExclusive: true,
      discPer,
      discAmount,
      serviceCharge: line.sc,
      levy: line.levy,
      vatId: (item.product as any)?.sVatId || (item as any)?.vatId || 1,
      vatAmount: line.vatAmount,
      netAmount: line.lineNetAmount,
      mapId,
      complimentaryStatus: Boolean(
        (isOrderBillDiscount && (billDiscountValue === 100 || (context as any).complimentaryStatus)) ||
        (item.discountType === "percentage" && Number(item.discountValue) === 100) ||
        (item as any).complimentaryStatus
      ),
    };
  });

  const modifiers: MenuOrderModifier[] = itemsWithMapId.flatMap(({ item, mapId }, idx) => {
    const pricedExtras = priced.lines[idx].pricedExtras || [];

    const seenExtraKeys = new Set<string>();
    const extrasRows: any[] = [];
    (item.extras || []).forEach((extra, exIdx) => {
      const exId = extra.id || 0;
      const key = `${mapId}-${exId}-${String(extra.name || "").trim().toLowerCase()}`;
      if (seenExtraKeys.has(key)) return;
      seenExtraKeys.add(key);

      const pricedExtra = pricedExtras[exIdx];
      const exQty = Number(extra.qty) || 1;
      extrasRows.push({
        mapId,
        modifierId: exId,
        qty: exQty,
        price: pricedExtra ? pricedExtra.basePrice : 0,
        amount: pricedExtra ? pricedExtra.baseAmount : 0,
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

  // ── Master totals are the sums of the detail rows (one source, always consistent) ──
  const sumOf = (pick: (d: MenuOrderDetail) => number) => roundCalc(details.reduce((s, d) => s + Number(pick(d) || 0), 0));

  const masterDiscAmount = isOrderBillDiscount ? sumOf((d) => d.discAmount) : 0;
  const masterDiscPer = isOrderBillDiscount && billDiscountType === "percentage" ? Number(billDiscountValue || 0) : 0;

  const isOrderComplimentary = Boolean(
    (billDiscountType === "percentage" && Number(billDiscountValue) === 100) ||
    (context as any).complimentaryStatus ||
    (cartDetails.length > 0 && cartDetails.every((i) => (i.discountType === "percentage" && Number(i.discountValue) === 100) || (i as any).complimentaryStatus))
  );

  const resolvedMasterSc = sumOf((d) => d.serviceCharge);
  const resolvedMasterLevy = sumOf((d) => d.levy);
  const taxableBase = priced.summary.vatExclAmount;
  const linesVat = sumOf((d) => d.vatAmount);
  const linesNetPayable = roundCalc(sumOf((d) => d.netAmount) + Number(deliveryCharge || 0));

  // TRANSITIONAL (until recall mapping is moved onto the engine): an unmodified recalled
  // order keeps the backend's stored totals, exactly as before this refactor.
  const useStoredTotals = !isOrderBillDiscount && total !== undefined && Number(total) > 0;
  const calcVatAmt = useStoredTotals && tax !== undefined && Number(tax) > 0 ? roundCalc(Number(tax)) : linesVat;
  const netPayable = useStoredTotals ? roundCalc(Number(total)) : linesNetPayable;

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
    serviceCharge: resolvedMasterSc,
    levy: resolvedMasterLevy,
    vatExclAmount: taxableBase,
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

  const billingConfig = getBillingConfig(session.providerId ? "Provider" : (context.selectedOrderTypeName || "DineIn"));
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

  const cleanedDetailsLevySum = roundCalc(cleanedDetails.reduce((sum, d) => sum + Number(d.levy || 0), 0));
  const cleanedDetailsScSum = roundCalc(cleanedDetails.reduce((sum, d) => sum + Number(d.serviceCharge || 0), 0));
  const resolvedUpdateLevy = Number(base.levy || 0) > 0
    ? roundCalc(base.levy || 0)
    : cleanedDetailsLevySum;
  const resolvedUpdateSc = Number(base.serviceCharge || 0) > 0
    ? roundCalc(base.serviceCharge || 0)
    : cleanedDetailsScSum;

  return {
    orderId: Number(orderId),
    customerId: Number(base.customerId || 1),
    employeeId: Number(base.employeeId || 1),
    discAmount: roundCalc(base.discAmount || 0),
    discPer: roundCalc(base.discPer || 0),
    complimentaryStatus: Boolean(base.complimentaryStatus || Number(base.discPer) === 100),
    serviceCharge: resolvedUpdateSc,
    levy: resolvedUpdateLevy,
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
