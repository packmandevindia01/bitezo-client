export interface PosCategory {
  id: number;
  name: string;
  arabicName?: string;
  imageUrl?: string | null;
  colorCode?: string;
}

export interface PosProduct {
  id: number;
  name: string;
  arabicName?: string;
  categoryId: number;
  price: number;
  sku?: string;
  prepTime?: string;
  imageUrl?: string | null;
  colorCode?: string;
  vatValue?: number;
  unitId?: number;
}

export interface PosCartItem {
  uniqueId: string;
  productId: number;
  quantity: number;
  variantName?: string;
  price?: number;
  isIncl?: boolean; // true = price already includes VAT, false = price is exclusive (add VAT on top), undefined = follow global config
  discountValue?: number;
  discountType?: 'percentage' | 'amount';
  extras?: { id: number; name: string; price: number; qty: number; typeId: number }[];
  modifiers?: { id: number; name: string; qty: number; typeId: number }[];
  isExisting?: boolean;
  mapId?: number;
  originalQty?: number;
  product?: {
    id: number;
    name: string;
    price: number;
    categoryId: number;
    unitId?: number;
    vatValue?: number;
    sVatId?: number;
  };
}

export interface PosQuickAction {
  id: string;
  label: string;
}

export interface PosOrderType {
  orderTypeId: number;
  orderType: string;
}

export interface PosTenderOption {
  id: string;
  label: string;
}

export interface DineInSection {
  sectionId: number;
  sectionName: string;
}

export interface DineInTable {
  tableId: number;
  tableName: string;
  positionNo: number;
  orderDate: string;
  employeeName: string | null;
  isUsed: boolean;
  // derived helpers added by dineInApi mapper:
  status: 'available' | 'occupied';
  position: number;
  capacity: number;
}

// --- Table Orders (GET /menu/dine-in/tables/{tableId}/orders) ---
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

export interface GeneralPrinterSettings {
  billPrinter: string;
  kotPrinter: string;
  packagerPrinter: string;
  masterKOT: string;
  masterKOTCount: number;
  masterKOTBillCount: number;
  androidBillPrinter: string;
  androidKOTPrinter: string;
  androidPackagerPrinter: string;
}

export interface CategoryPrinterSetting {
  categoryId: number;
  category?: string;
  firstPrinter: string;
  secondPrinter: string;
}

export interface ProductPrinterSetting {
  productId: number;
  product?: string;
  firstPrinter: string;
  secondPrinter: string;
}

export interface SectionPrinterSetting {
  sectionId: number;
  section?: string;
  firstPrinter: string;
  secondPrinter: string;
}

export interface OrderTypePrinterSetting {
  orderType: string;
  printer: string;
}
// ─── Menu API Types ──────────────────────────────────────────────────────────

export interface MenuGroup {
  groupId: number;
  groupName: string;
  arabicName: string;
}

export interface MenuSubCategory {
  subCategoryId: number;
  subCategoryName: string;
  arabicName: string;
  imageUrl: string | null;
}

export interface MenuMasterData {
  group: MenuGroup[];
  category: PosCategory[];
  orderTypes: PosOrderType[];
}

export interface PosAlternative {
  altName: string;
  altArabic: string;
  isIncl: boolean;
  price: number;
  unitId: number;
}

export interface PosExtra {
  id: number;
  name: string;
  arabicName?: string;
  price: number;
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
}

export interface PosModifierType {
  typeId: number;
  typeName: string;
  arabicName?: string;
}

// ─── Order API Types ──────────────────────────────────────────────────────────

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
  comingTime: string;
  details: MenuOrderDetail[];
  modifiers: MenuOrderModifier[];
  vehicleNo?: string;
  vehicleCustomerName?: string;
  providerId?: number;
  providerOrderNo?: string;
  providerNo?: string;
}

export interface MenuOrderUpdateRequest {
  orderId: number;
  customerId: number;
  employeeId: number;
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
  comingTime: string;
  providerNo: string;
  details: MenuOrderDetail[];
  modifiers: MenuOrderModifier[];
  voidProducts: { productId: number; unitId: number; qty: number; amount: number; mapId: number }[];
  voidModifiers: { mapId: number; modifierId: number; qty: number; amount: number }[];
  combinedOrderIds: number[];
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
  comingTime: string;
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

// ─── Recall API Types ─────────────────────────────────────────────────────────

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
}

export interface RecallResponse {
  data: RecallOrder[];
  status: number;
  message: string;
  isSuccess: boolean;
}

// ─── Void API Types ───────────────────────────────────────────────────────────

export interface VoidOrderRequest {
  orderId: number;
  reason: string;
  employeeId: number;
  voidDateTime: string;
  dayId: number;
  shiftId: number;
}

export interface MenuProvider {
  providerId: number;
  providerName: string;
  imageUrl: string | null;
}
