import axiosInstance from "../../../api/axiosInstance";
import type { ApiResponse } from "../../inventory/product/types";
import type { DineInSection, DineInTable, TableOrdersResponse } from "../types";

/** Raw shape returned by /menu/dine-in/sections/{sectionId}/tables */
interface RawDineInTable {
  tableId: number;
  tableName: string;
  positionNo: number;       // API typo fixed
  orderDate: string;
  employeeName: string | null;
  isUsed: boolean;
  chairs?: number;
  isReserved?: boolean;
  reserved?: boolean;
  isReserve?: boolean;
  status?: string;
  tableStatus?: string;
  reservationStatus?: string;
}

export const dineInApi = {
  getSections: async () => {
    const { data } = await axiosInstance.get<ApiResponse<DineInSection[]>>("/menu/dine-in/sections");
    return data;
  },

  getTables: async (sectionId: number) => {
    const { data } = await axiosInstance.get<ApiResponse<RawDineInTable[]>>(
      `/menu/dine-in/sections/${sectionId}/tables`
    );

    // Map raw API fields → DineInTable shape used throughout the POS
    if (data.isSuccess && Array.isArray(data.data)) {
      const mapped: DineInTable[] = data.data.map((t: any, idx) => {
        const isReserved = Boolean(
          t.isReserved ||
          t.isReserve ||
          t.reserved ||
          (typeof t.status === 'string' && t.status.toLowerCase() === 'reserved') ||
          (typeof t.tableStatus === 'string' && t.tableStatus.toLowerCase() === 'reserved') ||
          (typeof t.reservationStatus === 'string' && t.reservationStatus.toLowerCase() === 'reserved') ||
          /reserved/i.test(t.tableName || '') ||
          /reservation/i.test(t.tableName || '')
        );
        const status: 'available' | 'occupied' | 'reserved' = isReserved
          ? 'reserved'
          : t.isUsed
          ? 'occupied'
          : 'available';

        return {
          ...t,
          tableId: t.tableId,
          tableName: t.tableName,
          positionNo: t.positionNo,
          orderDate: t.orderDate,
          employeeName: t.employeeName,
          isUsed: Boolean(t.isUsed || isReserved),
          status,
          isReserved,
          position: t.positionNo > 0 ? t.positionNo : idx + 1,
          capacity: t.chairs ?? 0,
        };
      });
      return { ...data, data: mapped } as ApiResponse<DineInTable[]>;
    }

    return data as unknown as ApiResponse<DineInTable[]>;
  },

  /** Fetch all orders for an occupied table */
  getTableOrders: async (tableId: number) => {
    const priceView = (() => {
      try {
        const saved = localStorage.getItem('posConfigs');
        const full = saved ? JSON.parse(saved) : {};
        return full?.configs?.priceView === 'Inclusive' ? 'Inclusive' : 'Exclusive';
      } catch { return 'Exclusive'; }
    })();
    const { data } = await axiosInstance.get<ApiResponse<TableOrdersResponse>>(
      `/menu/dine-in/tables/${tableId}/orders`,
      { params: { priceView } }
    );
    return data;
  },
};
