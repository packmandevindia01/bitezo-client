export interface PosOrderType {
  orderTypeId: number;
  orderType: string;
}

export interface PosTenderOption {
  id: string;
  label: string;
}

export interface TableOrderMaster {
  orderId: number;
  orderNo: number;
  ticketNo: number;
  sectionName: string;
  tableNo: string;
  netAmount: number;
}

export interface TableOrderDetail {
  orderId: number;
  qty: number;
  productName: string;
  arabicName: string;
  altName: string;
  altArabicName: string;
  amount: number;
  mapId: number;
}

export interface TableOrderModifier {
  orderId: number;
  qty: number;
  modifierName: string;
  arabicName: string;
  mapId: number;
}

export interface TableOrdersResponse {
  masterData: TableOrderMaster[];
  detailsData: TableOrderDetail[];
  modifiersData: TableOrderModifier[];
}

export interface MenuOrderDetail {
  productId: number;
  unitId: number;
  qty: number;
  price: number;
  discPer: number;
  discAmount: number;
  serviceCharge: number;
  levy: number;
  vatId: number;
  vatAmount: number;
  netAmount: number;
  modifierId?: number;
  modifierType?: number;
  mapId: number;
  complimentaryStatus: boolean;
  baseQty?: number;
}

export interface MenuOrderModifier {
  mapId: number;
  modifierId: number;
  qty: number;
  price: number;
  amount: number;
  typeId?: number;
}

export interface MenuOrderRequest {
  voucherDate: string;
  customerId: number;
  employeeId: number;
  dayId: number;
  shiftId: number;
  transDate?: string;
  discAmount: number;
  discPer: number;
  serviceCharge: number;
  levy: number;
  vatExclAmount: number;
  vatAmount: number;
  netAmount: number;
  createdAt: string;
  orderTypeId: number;
  sectionId: number;
  tableId: number;
  guestNo: number;
  addressId: number;
  missedCall: boolean;
  contactNo: string;
  note: string;
  change: string;
  isComing: boolean;
  comingTime?: string | null;
  details: MenuOrderDetail[];
  modifiers: MenuOrderModifier[];
  vehicleNo?: string;
  vehicleCustomerName?: string;
  providerId?: number;
  providerOrderNo?: string;
  providerNo?: string;
  deliveryCharge?: number;
  driverId?: number;
}

export interface MenuOrderUpdateRequest {
  orderId: number;
  customerId: number;
  employeeId: number;
  transDate?: string;
  discAmount: number;
  discPer: number;
  serviceCharge: number;
  levy: number;
  vatExclAmount: number;
  vatAmount: number;
  netAmount: number;
  updatedAt: string;
  orderTypeId: number;
  sectionId: number;
  tableId: number;
  guestNo: number;
  vehicleCustomerName: string;
  vehicleNo: string;
  addressId: number;
  missedCall: boolean;
  contactNo: string;
  note: string;
  change: string;
  isComing: boolean;
  comingTime?: string | null;
  providerNo: string;
  details: MenuOrderDetail[];
  modifiers: MenuOrderModifier[];
  voidProducts: { productId: number; unitId: number; qty: number; amount: number; mapId: number }[];
  voidModifiers: { mapId: number; modifierId: number; qty: number; amount: number; typeId: number }[];
  combinedOrderIds: number[];
  deliveryCharge?: number;
  driverId?: number;
}

export interface SplitOrderData {
  order: {
    sectionId: number;
    tableId: number;
    guestNo: number;
    serviceCharge: number;
    levy: number;
    vatExclAmount: number;
    vatAmount: number;
    netAmount: number;
  };
  details: any[];
  modifiers: any[];
}

export interface SplitOrderRequest {
  orderId: number;
  voucherDate: string;
  customerId: number;
  employeeId: number;
  dayId: number;
  shiftId: number;
  createdAt: string;
  orderTypeId: number;
  vehicleCustomerName: string;
  vehicleNo: string;
  addressId: number;
  missedCall: boolean;
  contactNo: string;
  note: string;
  change: string;
  isComing: boolean;
  comingTime?: string | null;
  providerNo: string;
  baseOrder: SplitOrderData;
  newOrders: SplitOrderData[];
}

export interface MenuOrderResponse {
  data: {
    id: number;
  };
  status: number;
  message: string;
  isSuccess: boolean;
}

export interface RecallParams {
  DayId?: number;
  EmployeeId?: number;
  OrderTypeId?: number;
  SearchStatus?: string;
  SearchValue?: string;
  DeliveryOutStatus?: boolean;
  DeliveryOutOnlyStatus?: boolean;
  ProviderName?: string;
  Decimals?: number;
}

export interface RecallOrder {
  orderId: number;
  details: string;
  isPrinted: boolean;
  driverId?: number;
  driverName?: string;
  allocatedDriverName?: string;
  driver?: string;
  driverEmployeeName?: string;
}

export interface RecallResponse {
  data: RecallOrder[];
  status: number;
  message: string;
  isSuccess: boolean;
}

export interface VoidOrderRequest {
  orderId: number;
  reason: string;
  employeeId: number;
  voidDateTime: string;
  dayId: number;
  shiftId: number;
}
