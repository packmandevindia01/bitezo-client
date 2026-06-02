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
      const mapped: DineInTable[] = data.data.map((t, idx) => ({
        tableId: t.tableId,
        tableName: t.tableName,
        positionNo: t.positionNo,
        orderDate: t.orderDate,
        employeeName: t.employeeName,
        isUsed: t.isUsed,
        // derived
        status: t.isUsed ? 'occupied' : 'available',
        position: t.positionNo > 0 ? t.positionNo : idx + 1,
        capacity: 0,   // endpoint doesn't return seat count
      }));
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
