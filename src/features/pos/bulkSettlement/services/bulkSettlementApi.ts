import axiosInstance from "../../../../api/axiosInstance";
import type {
  EntityOption,
  EntityType,
  UnsettledOrder,
  DriverSettlementPayload,
  ProviderSettlementPayload,
  DaySettlementPayload,
  PendingOrderStatusResponse,
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
    let activeDayId = dayId && dayId > 0 ? dayId : (
      Number(localStorage.getItem("pos_dayId")) ||
      Number(localStorage.getItem("systemDayId")) ||
      Number(localStorage.getItem("dayId")) || 0
    );
    if (!activeDayId) {
      try {
        const parsed = JSON.parse(localStorage.getItem("activeShift") || "{}");
        if (parsed?.dayId) activeDayId = Number(parsed.dayId);
      } catch {}
    }
    if (!activeDayId) activeDayId = 1;

    let activeCounterId = counterId && counterId > 0 ? counterId : (
      Number(localStorage.getItem("systemCounterId")) ||
      Number(localStorage.getItem("counterId")) ||
      Number(localStorage.getItem("activeCounterId")) || 1
    );
    if (!activeCounterId || activeCounterId < 1) activeCounterId = 1;

    const parseOrderList = (data: any): any[] => {
      let list: any[] = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (data && typeof data === "object") {
        if (Array.isArray(data.data)) list = data.data;
        else if (Array.isArray(data.items)) list = data.items;
        else if (Array.isArray(data.result)) list = data.result;
        else if (Array.isArray(data.orders)) list = data.orders;
        else if (Array.isArray(data.records)) list = data.records;
        else if (data.data && typeof data.data === "object") {
          if (Array.isArray(data.data.items)) list = data.data.items;
          else if (Array.isArray(data.data.records)) list = data.data.records;
          else if (Array.isArray(data.data.orders)) list = data.data.orders;
          else if (Array.isArray(data.data.result)) list = data.data.result;
        }
      }
      return list;
    };

    const fetchEndpoint = async (dId: number, cId: number) => {
      const validCounterId = Math.max(1, cId);
      const endpoint =
        entityType === "driver"
          ? `/sales-invoices/${dId}/${validCounterId}/${entityId}/driver-pending-orders`
          : `/sales-invoices/${dId}/${validCounterId}/${entityId}/provider-pending-orders`;

      console.log(`[bulkSettlementApi] Fetching: ${endpoint} (decimals=${decimals})`);
      const res = await axiosInstance.get(endpoint, {
        params: { decimals },
      });
      const parsed = parseOrderList(res.data);
      console.log(`[bulkSettlementApi] Result for ${endpoint}:`, parsed);
      return { list: parsed };
    };

    try {
      // Primary attempt: active day and active counter
      let { list } = await fetchEndpoint(activeDayId, activeCounterId);

      // Fallback: If empty on counter 1, check counter 2 (or vice-versa)
      if (list.length === 0) {
        const altCounterId = activeCounterId === 1 ? 2 : 1;
        try {
          const fallbackRes = await fetchEndpoint(activeDayId, altCounterId);
          if (fallbackRes.list.length > 0) {
            console.log(`[bulkSettlementApi] Found ${fallbackRes.list.length} orders using counter=${altCounterId} fallback!`);
            list = fallbackRes.list;
          }
        } catch (e) {
          console.debug(`[bulkSettlementApi] counter=${altCounterId} check skipped:`, e);
        }
      }

      return list.map((o: any) => {
        const detailsStr = o.details || "";

        // Parse orderNo from details if not directly provided
        let orderNo = o.orderNo ?? o.voucherNo ?? o.invoiceNo;
        if (!orderNo && detailsStr) {
          const match = detailsStr.match(/Order\s*:\s*(\w+)/i);
          if (match) orderNo = match[1];
        }
        if (!orderNo) orderNo = `ORD-${o.orderId ?? o.saleId ?? o.salesInvoiceId ?? o.sNo ?? 1}`;

        // Parse token / ticket
        let tokenNo = o.tokenNo ?? o.ticketNo ?? o.token ?? o.ticket;
        if (!tokenNo && detailsStr) {
          const match = detailsStr.match(/(?:Token|Ticket)\s*:\s*(\w+)/i);
          if (match) tokenNo = match[1];
        }
        if (!tokenNo) tokenNo = String(orderNo).replace(/^ORD-/, "");

        // Parse customer address (flatNo/buildingNo/roadNo/blockNo or direct address field)
        let customerAddress = o.customerAddress ?? o.deliveryAddress ?? o.address;
        if (!customerAddress && (o.flatNo || o.buildingNo || o.roadNo || o.blockNo)) {
          customerAddress = [o.flatNo, o.buildingNo, o.roadNo, o.blockNo]
            .filter((v) => v !== undefined && v !== null && String(v).trim() !== "")
            .join("/");
        }
        if (!customerAddress && detailsStr) {
          const match =
            detailsStr.match(/Address\s*:\s*([^,\n]+)/i) ||
            detailsStr.match(/Addr\s*:\s*([^,\n]+)/i);
          if (match) customerAddress = match[1].trim();
        }

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
          orderId: o.orderId ?? o.saleId ?? o.salesInvoiceId ?? o.id ?? 0,
          orderNo: String(orderNo),
          tokenNo: String(tokenNo || orderNo),
          customerAddress: String(customerAddress || "-"),
          orderDate: o.orderDate ?? o.createdAt ?? o.transDate ?? new Date().toLocaleTimeString(),
          customerName: String(customerName),
          orderType: o.orderType ?? o.type ?? (entityType === "driver" ? "Delivery" : "Provider"),
          paymodeName: o.paymodeName ?? o.paymode ?? "Cash",
          paymodeId: o.paymodeId ?? o.payModeId ?? 1,
          totalAmount: Number(totalAmount || 0),
          driverId: o.driverId,
          providerId: o.providerId,
          details: detailsStr,
          raw: o,
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

  // Check if there are any pending orders for the day
  // GET /api/sales-invoices/{dayId}/pending-order-status
  checkPendingOrderStatus: async (dayId: number): Promise<PendingOrderStatusResponse> => {
    const res = await axiosInstance.get<{ data: PendingOrderStatusResponse; isSuccess: boolean; message: string }>(
      `/sales-invoices/${dayId}/pending-order-status`
    );
    if (res.data?.isSuccess && res.data?.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || "Failed to check pending order status");
  },

  // Settle all pending orders for the day
  // POST /api/sales-invoices/day-settlement
  submitDaySettlement: async (
    payload: DaySettlementPayload
  ): Promise<{ isSuccess: boolean; message?: string }> => {
    const res = await axiosInstance.post("/sales-invoices/day-settlement", payload);
    const data = res.data;
    if (data && typeof data === "object" && "isSuccess" in data && !data.isSuccess) {
      throw new Error(data.message || "Day settlement failed");
    }
    return { isSuccess: true, message: data?.message || "Day settlement completed successfully" };
  },
};
