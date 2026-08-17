import axiosInstance from "../../../../api/axiosInstance";
import type { EntityOption, EntityType, UnsettledOrder, BulkSettlementPayload } from "../types";
import { employeeService } from "../../../general/employee/services/employeeService";
import { fetchProviders } from "../../../general/provider/services/providerService";

const unwrap = async <T>(promise: Promise<any>): Promise<T> => {
  const res = await promise;
  if (res?.data && typeof res.data === "object") {
    if ("isSuccess" in res.data && !res.data.isSuccess) {
      throw new Error(res.data.message || "Request failed");
    }
    return res.data.data !== undefined ? res.data.data : res.data;
  }
  return res as T;
};

export const bulkSettlementApi = {
  // Fetch drivers list for given branch
  getDriversList: async (branchId: number): Promise<EntityOption[]> => {
    try {
      const raw = await employeeService.getDrivers(branchId);
      return (raw || []).map((item) => ({
        id: item.driverId,
        name: item.driverName,
      }));
    } catch {
      return [];
    }
  },

  // Fetch providers list
  getProvidersList: async (): Promise<EntityOption[]> => {
    try {
      const raw = await fetchProviders();
      return (raw || []).map((item: any) => ({
        id: item.providerId ?? item.id,
        name: item.providerName ?? item.name,
      }));
    } catch {
      return [];
    }
  },

  // Fetch unsettled orders for selected driver/provider
  getUnsettledOrders: async (
    entityType: EntityType,
    entityId: number,
    branchId: number
  ): Promise<UnsettledOrder[]> => {
    try {
      const paramKey = entityType === "driver" ? "driverId" : "providerId";
      const res = await unwrap<any[]>(
        axiosInstance.get("/order/unsettled-orders", {
          params: { [paramKey]: entityId, branchId },
        })
      );
      if (Array.isArray(res)) {
        return res.map((o: any) => ({
          orderId: o.orderId ?? o.id,
          orderNo: o.orderNo ?? o.voucherNo ?? `ORD-${o.orderId}`,
          orderDate: o.orderDate ?? o.createdAt ?? new Date().toISOString(),
          customerName: o.customerName ?? o.customer,
          orderType: o.orderType ?? o.type ?? (entityType === "driver" ? "Delivery" : "Provider"),
          paymodeName: o.paymodeName ?? o.paymode,
          totalAmount: Number(o.totalAmount ?? o.netAmount ?? o.amount ?? 0),
          driverId: o.driverId,
          providerId: o.providerId,
        }));
      }
      return [];
    } catch {
      // Return clean empty array on endpoint 404 or empty state
      return [];
    }
  },

  // Submit bulk settlement
  submitBulkSettlement: async (payload: BulkSettlementPayload): Promise<{ isSuccess: boolean; message?: string }> => {
    try {
      const res = await unwrap<any>(
        axiosInstance.post("/order/bulk-settlement", {
          entityType: payload.entityType,
          entityId: payload.entityId,
          orderIds: payload.orderIds,
          totalAmount: payload.totalAmount,
          settlementDate: payload.settlementDate || new Date().toISOString(),
        })
      );
      return { isSuccess: true, message: res?.message || "Settlement completed successfully" };
    } catch (err: any) {
      throw new Error(err.message || "Failed to submit bulk settlement");
    }
  },
};
