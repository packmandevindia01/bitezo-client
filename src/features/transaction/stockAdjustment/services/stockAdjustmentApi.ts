import { unwrapTransaction as unwrap } from "@shared/api/unwrap";
import { formatDateOnly } from "@shared/lib/date";
import axiosInstance from "../../../../api/axiosInstance";
import type { StockAdjustmentCreatePayload, StockAdjustmentUpdatePayload } from "../types";
import { parseUnitCost } from "../../shared/lineUnits";
import { createStockDocumentApi } from "../../shared/stockDocumentApi";

export { formatDateOnly };

const BASE_URL = "/stock-adjustment";
const { getDetails, getById, cancel, ...shared } = createStockDocumentApi(BASE_URL);

export const stockAdjustmentApi = {
  ...shared,
  getStockAdjustmentDetails: getDetails,
  getStockAdjustmentById: getById,
  cancelStockAdjustment: cancel,

  getUnitCost: async (productId: number, unitId: number): Promise<number> => {
    const data = await unwrap<unknown>(axiosInstance.get(`${BASE_URL}/${productId}/unit-cost/${unitId}`));
    return parseUnitCost(data);
  },

  createStockAdjustment: (payload: StockAdjustmentCreatePayload) =>
    unwrap<unknown>(axiosInstance.post(BASE_URL, { ...payload, transDate: formatDateOnly(payload.transDate) })),

  updateStockAdjustment: (transId: number, payload: StockAdjustmentUpdatePayload) =>
    unwrap<unknown>(axiosInstance.put(`${BASE_URL}/${transId}`, { ...payload, transDate: formatDateOnly(payload.transDate) })),
};
