import axiosInstance from "../../../../api/axiosInstance";
import type {
  EntityOption,
  EntityType,
  UnsettledOrder,
  DriverSettlementPayload,
  ProviderSettlementPayload,
} from "../types";

export const bulkSettlementApi = {
  // Fetch drivers list (GET /api/employee/{branchId}/drivers)
  getDriversList: async (branchId: number): Promise<EntityOption[]> => {
    try {
      const activeBranchId = branchId && branchId > 0 ? branchId : 1;
      const res = await axiosInstance.get(`/employee/${activeBranchId}/drivers`);
      const data = res.data;
      let list: any[] = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (data && Array.isArray(data.data)) {
        list = data.data;
      }

      return list.map((item: any) => ({
        id: item.driverId ?? item.empId ?? item.id,
        name: item.driverName ?? item.empName ?? item.name ?? `Driver #${item.driverId || item.id}`,
      }));
    } catch (err) {
      console.error("Failed to fetch drivers from backend:", err);
      return [];
    }
  },

  // Fetch providers list (GET /api/provider/provider-list)
  getProvidersList: async (): Promise<EntityOption[]> => {
    try {
      const res = await axiosInstance.get("/provider/provider-list");
      const data = res.data;
      let list: any[] = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (data && Array.isArray(data.data)) {
        list = data.data;
      }

      return list.map((item: any) => ({
        id: item.providerId ?? item.id,
        name: item.providerName ?? item.name ?? item.provider ?? `Provider #${item.providerId || item.id}`,
        paymodeName: item.paymode,
      }));
    } catch (err) {
      console.error("Failed to fetch providers from backend:", err);
      return [];
    }
  },

  // Fetch unsettled orders for selected driver or provider
  getUnsettledOrders: async (
    entityType: EntityType,
    entityId: number,
    dayId: number,
    counterId: number,
    decimals: number = 3
  ): Promise<UnsettledOrder[]> => {
    const activeDayId = dayId ?? 0;
    const activeCounterId = counterId && counterId > 0 ? counterId : 1;

    const endpoint =
      entityType === "driver"
        ? `/sales-invoices/${activeDayId}/${activeCounterId}/${entityId}/driver-pending-orders`
        : `/sales-invoices/${activeDayId}/${activeCounterId}/${entityId}/provider-pending-orders`;

    try {
      const res = await axiosInstance.get(endpoint, {
        params: { decimals },
      });
      const data = res.data;
      let list: any[] = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (data && Array.isArray(data.data)) {
        list = data.data;
      }

      return list.map((o: any) => {
        const detailsStr = o.details || "";

        // Parse orderNo from details if not directly provided
        let orderNo = o.orderNo ?? o.voucherNo;
        if (!orderNo && detailsStr) {
          const match = detailsStr.match(/Order\s*:\s*(\w+)/i);
          if (match) orderNo = match[1];
        }
        if (!orderNo) orderNo = `ORD-${o.orderId ?? o.sNo ?? 1}`;

        // Parse customerName from details if not directly provided
        let customerName = o.customerName ?? o.customer;
        if (!customerName && detailsStr) {
          const match = detailsStr.match(/\(([^)]+)\)/);
          if (match) customerName = match[1];
        }
        if (!customerName) customerName = "Cash Customer";

        // Parse totalAmount from details if not directly provided
        let totalAmount = Number(o.totalAmount ?? o.netAmount ?? o.amount ?? o.grandTotal ?? 0);
        if ((!totalAmount || isNaN(totalAmount)) && detailsStr) {
          const match = detailsStr.match(/Amnt\s*:\s*([\d.]+)/i);
          if (match) totalAmount = parseFloat(match[1]);
        }

        return {
          orderId: o.orderId ?? o.id ?? 0,
          orderNo: String(orderNo),
          orderDate: o.orderDate ?? o.createdAt ?? o.transDate ?? new Date().toLocaleTimeString(),
          customerName: String(customerName),
          orderType: o.orderType ?? o.type ?? (entityType === "driver" ? "Delivery" : "Provider"),
          paymodeName: o.paymodeName ?? o.paymode ?? "Cash",
          paymodeId: o.paymodeId ?? o.payModeId ?? 1,
          totalAmount: Number(totalAmount || 0),
          driverId: o.driverId,
          providerId: o.providerId,
          details: detailsStr,
        };
      });
    } catch (err: any) {
      console.error(`Failed to fetch unsettled orders for ${entityType}:`, err);
      return [];
    }
  },

  // Submit Driver Settlement (POST /api/sales-invoices/driver-settlement)
  submitDriverSettlement: async (
    payload: DriverSettlementPayload
  ): Promise<{ isSuccess: boolean; message?: string }> => {
    const res = await axiosInstance.post("/sales-invoices/driver-settlement", payload);
    const data = res.data;
    if (data && typeof data === "object" && "isSuccess" in data && !data.isSuccess) {
      throw new Error(data.message || "Driver settlement failed");
    }
    return { isSuccess: true, message: data?.message || "Driver settlement completed successfully" };
  },

  // Submit Provider Settlement (POST /api/sales-invoices/provider-settlement)
  submitProviderSettlement: async (
    payload: ProviderSettlementPayload
  ): Promise<{ isSuccess: boolean; message?: string }> => {
    const res = await axiosInstance.post("/sales-invoices/provider-settlement", payload);
    const data = res.data;
    if (data && typeof data === "object" && "isSuccess" in data && !data.isSuccess) {
      throw new Error(data.message || "Provider settlement failed");
    }
    return { isSuccess: true, message: data?.message || "Provider settlement completed successfully" };
  },
};
