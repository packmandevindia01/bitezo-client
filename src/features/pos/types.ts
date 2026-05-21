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
  productId: number;
  quantity: number;
  variantName?: string;
  price?: number;
  discountValue?: number;
  discountType?: 'percentage' | 'amount';
  extras?: { id: number; name: string; price: number; qty: number }[];
  modifiers?: { id: number; name: string; qty: number }[];
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
  capacity: number;
  status: 'available' | 'occupied';
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
  modifierId: number;
  modifierType: number;
  mapId: number;
  complimentaryStatus: boolean;
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
  vehicleNo?: string;
  vehicleCustomerName?: string;
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
  OrderType?: string;
  SearchStatus?: string;
  SearchValue?: string;
  DeliveryOutStatus?: boolean;
  DeliveryOutOnlyStatus?: boolean;
  ProviderName?: string;
}

export interface RecallOrder {
  transId: number;
  details: string;
  isPrinted: boolean;
}

export interface RecallResponse {
  data: RecallOrder[];
  status: number;
  message: string;
  isSuccess: boolean;
}
