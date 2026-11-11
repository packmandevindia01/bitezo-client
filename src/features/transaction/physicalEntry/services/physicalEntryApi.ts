import { unwrapTransaction as unwrap } from "@shared/api/unwrap";
import { formatDateOnly } from "@shared/lib/date";
import axiosInstance from "../../../../api/axiosInstance";
import type { PhysicalEntryCreatePayload, PhysicalEntryUpdatePayload } from "../types";
import { createStockDocumentApi } from "../../shared/stockDocumentApi";

export { formatDateOnly };

const BASE_URL = "/physical-entry";
const { getDetails, getById, cancel, ...shared } = createStockDocumentApi(BASE_URL);

export const physicalEntryApi = {
  ...shared,
  getPhysicalEntryDetails: getDetails,
  getPhysicalEntryById: getById,
  cancelPhysicalEntry: cancel,

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the form reads the cost from several reply shapes
  getUnitCost: (productId: number, unitId: number) => unwrap<any>(axiosInstance.get(`${BASE_URL}/${productId}/unit-cost/${unitId}`)),

  createPhysicalEntry: (payload: PhysicalEntryCreatePayload) =>
    unwrap<unknown>(
      axiosInstance.post(BASE_URL, {
        ...payload,
        transDate: formatDateOnly(payload.transDate),
        createdAt: payload.createdAt || new Date().toISOString(),
      })
    ),

  updatePhysicalEntry: (transId: number, payload: PhysicalEntryUpdatePayload) =>
    unwrap<unknown>(
      axiosInstance.put(`${BASE_URL}/${transId}`, {
        ...payload,
        transId,
        transDate: formatDateOnly(payload.transDate),
        updatedAt: payload.updatedAt || new Date().toISOString(),
      })
    ),

  getAsOnDateStock: (productId: number, branchId: number, asOnDate?: string) =>
    unwrap<any>(
      axiosInstance.get(`/product/as-on-date-stock/${productId}/${branchId}`, {
        params: { asOnDate: asOnDate ? formatDateOnly(asOnDate) : undefined },
      })
    ),
};
