import { roundCalc } from "../utils/billing";
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
    subtotal,
    discount,
    tax,
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

  const details: MenuOrderDetail[] = itemsWithMapId.map(({ item, mapId }) => {
    const mainNetAmount = item.mainNetAmount !== undefined ? item.mainNetAmount : (item.lineTotal || 0);
    const mainVatAmount = item.mainVatAmount !== undefined ? item.mainVatAmount : (item.vatAmount || 0);
    const mainSc = item.mainSc !== undefined ? item.mainSc : (item.sc || 0);
    const mainLevy = item.mainLevy !== undefined ? item.mainLevy : (item.levy || 0);

    return {
      productId: item.productId || item.product?.id || 0,
      unitId: item.unitId || item.product?.unitId || 1,
      qty: item.quantity,
      price: roundCalc(item.price ?? item.product?.price ?? 0),
      discPer:
        item.discountType === "percentage"
          ? roundCalc(item.discountValue || 0)
          : billDiscountType === "percentage"
          ? billDiscountValue
          : 0,
      discAmount: roundCalc(
        item.effectiveDiscountAmount ?? (item.discountType === "amount" ? item.discountValue || 0 : 0)
      ),
      serviceCharge: roundCalc(mainSc),
      levy: roundCalc(mainLevy),
      vatId: (item.product as any)?.sVatId || (item as any)?.vatId || 1,
      vatAmount: roundCalc(mainVatAmount),
      netAmount: roundCalc(mainNetAmount),
      mapId,
      complimentaryStatus: Boolean(
        (item.discountType === "percentage" && Number(item.discountValue) === 100) ||
        (billDiscountType === "percentage" && Number(billDiscountValue) === 100) ||
        (item as any).complimentaryStatus
      ),
    };
  });

  const modifiers: MenuOrderModifier[] = itemsWithMapId.flatMap(({ item, mapId }) => {
    const extrasRows = (item.extras || []).map((extra) => ({
      mapId,
      modifierId: extra.id,
      qty: extra.qty || 1,
      price: roundCalc(extra.price),
      amount: roundCalc((extra.price || 0) * (extra.qty || 1)),
      typeId: extra.typeId,
    }));

    const modifierRows = (item.modifiers || []).map((mod) => ({
      mapId,
      modifierId: mod.id,
      qty: mod.qty || 1,
      price: 0,
      amount: 0,
      typeId: mod.typeId,
    }));

    const messageRows = (item.messages || []).map((msg) => ({
      mapId,
      modifierId: msg.id || 0,
      qty: 1,
      price: 0,
      amount: 0,
      typeId: 1,
    }));

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

  return {
    orderId: editingOrderId || 0,
    customerId: session.customerId || selectedCustomerId || 1,
    employeeId: session.employeeId ?? session.userId ?? 1,
    transDate: activeTransDate,
    discAmount: roundCalc(discount),
    discPer: billDiscountType === "percentage" ? billDiscountValue : 0,
    serviceCharge: roundCalc(totalServiceCharge),
    levy: roundCalc(totalLevy),
    vatExclAmount: roundCalc(subtotal),
    vatAmount: roundCalc(tax),
    netAmount: roundCalc(total),
    deliveryCharge: roundCalc(deliveryCharge),
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
      productId: vp.productId,
      unitId: vp.unitId,
      qty: vp.qty,
      amount: vp.amount,
      mapId: vp.mapId,
    })),
    voidModifiers: voidModifiers.filter((vm) => !voidProducts.some((vp) => vp.mapId === vm.mapId)),
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

  const cleanedDetails: MenuOrderDetail[] = base.details.map((d) => ({
    productId: d.productId,
    unitId: d.unitId,
    qty: d.qty,
    price: d.price,
    discPer: d.discPer,
    discAmount: d.discAmount,
    serviceCharge: d.serviceCharge,
    levy: d.levy,
    vatId: d.vatId,
    vatAmount: d.vatAmount,
    netAmount: d.netAmount,
    mapId: d.mapId,
    complimentaryStatus: d.complimentaryStatus,
  }));

  return {
    orderId,
    customerId: base.customerId,
    employeeId: base.employeeId,
    discAmount: base.discAmount,
    discPer: base.discPer,
    serviceCharge: base.serviceCharge,
    levy: base.levy,
    vatExclAmount: base.vatExclAmount,
    vatAmount: base.vatAmount,
    netAmount: base.netAmount,
    updatedAt: new Date().toISOString(),
    prevUpdatedAt: resolvedPrevUpdatedAt || new Date().toISOString(),
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
    comingTime: base.comingTime,
    providerNo: base.providerNo || "",
    deliveryCharge: base.deliveryCharge,
    driverId: base.driverId,
    details: cleanedDetails,
    modifiers: base.modifiers,
    voidProducts: base.voidProducts,
    voidModifiers: base.voidModifiers,
    combinedOrderIds: base.combinedOrderIds,
  };
};
