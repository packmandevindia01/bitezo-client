export type EntityType = "driver" | "provider";

export interface EntityOption {
  id: number;
  name: string;
  paymodeId?: number;
  paymodeName?: string;
}

export interface UnsettledOrder {
  orderId: number;
  orderNo: string;
  orderDate: string;
  customerName?: string;
  orderType: string;
  paymodeName?: string;
  paymodeId?: number;
  totalAmount: number;
  driverId?: number;
  providerId?: number;
}

export interface DriverPaymodeItem {
  paymodeId: number;
  amount: number;
}

export interface DriverSettlementOrderItem {
  orderId: number;
  paymodes: DriverPaymodeItem[];
}

export interface DriverSettlementPayload {
  seriesId: number;
  prefix: string;
  dayId: number;
  shiftId: number;
  createdAt: string;
  voucherDate: string;
  transDate: string;
  orders: DriverSettlementOrderItem[];
}

export interface ProviderSettlementPayload {
  seriesId: number;
  prefix: string;
  dayId: number;
  shiftId: number;
  postAccountId: number;
  createdAt: string;
  voucherDate: string;
  transDate: string;
  orderIds: number[];
}

export interface BulkSettlementFilter {
  entityType: EntityType;
  entityId: number | null;
  dayId?: number;
  counterId?: number;
}
