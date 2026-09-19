export interface SalesInvoiceDetail {
  productId: number;
  unitId: number;
  vatId: number;
  qty: number;
  price: number;
  discPer: number;
  discAmount: number;
  serviceCharge: number;
  levy: number;
  vatAmount: number;
  netAmount: number;
  baseQty: number;
  mapId: number;
  complimentaryStatus: boolean;
}

export interface PaymodeItem {
  paymodeId: number;
  paymodeName?: string;
  amount: number;
}

export interface SalesInvoicePayload {
  seriesId: number;
  prefix: string;
  customerId: number;
  paymodeId: number;
  employeeId: number;
  dayId: number;
  shiftId: number;
  transDate: string;
  orderTypeId: number;
  androidStatus: boolean;
  saleId?: number;
  orderId: number;
  voucherDate: string;
  discAmount: number;
  discPer: number;
  serviceCharge: number;
  levy: number;
  vatExclAmount: number;
  vatAmount: number;
  netAmount: number;
  deliveryCharge?: number;
  orderMaster: {
    isOrderEdited?: boolean;
    sectionId?: number;
    tableId?: number;
    guestNo?: number;
    vehicleCustomerName?: string;
    vehicleNo?: string;
    addressId?: number;
    missedCall?: boolean;
    contactNo?: string;
    note?: string;
    change?: string;
    isComing?: boolean;
    comingTime?: string;
    providerNo?: string;
    driverId?: number;
    transDate?: string;
  };
  combinedOrderIds?: number[];
  modifiers?: any[];
  voidProducts?: any[];
  voidModifiers?: any[];
  createdAt?: string;
  updateAt?: string;
  updatedAt?: string;
  details: SalesInvoiceDetail[];
  paymodes: {
    paymodeId: number;
    amount: number;
  }[];
}
