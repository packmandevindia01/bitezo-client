export type EntityType = "driver" | "provider";

export interface EntityOption {
  id: number;
  name: string;
}

export interface UnsettledOrder {
  orderId: number;
  orderNo: string;
  orderDate: string;
  customerName?: string;
  orderType: string;
  paymodeName?: string;
  totalAmount: number;
  driverId?: number;
  providerId?: number;
}

export interface BulkSettlementPayload {
  entityType: EntityType;
  entityId: number;
  orderIds: number[];
  totalAmount: number;
  settlementDate?: string;
}

export interface BulkSettlementFilter {
  entityType: EntityType;
  entityId: number | null;
}
