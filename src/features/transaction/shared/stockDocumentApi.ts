import { unwrapTransaction as unwrap } from "@shared/api/unwrap";
import { formatDateOnly } from "@shared/lib/date";
import axiosInstance from "../../../api/axiosInstance";

export interface StockDocumentListParams {
  BranchId?: number;
  FromDate?: string;
  ToDate?: string;
  RefNo?: string;
  Decimals?: number;
}

export interface StockDocumentRow {
  transId: number;
  transDate?: string;
  refNo?: string;
  branch?: string;
  fromBranch?: string;
  toBranch?: string;
  netAmount?: number | string;
}

export interface StockDocumentBranch {
  branchId: number;
  branchName: string;
}

/** The requests Stock Adjustment and Physical Entry make in the same way. Saving differs, so it stays in each API. */
export const createStockDocumentApi = (baseUrl: string) => ({
  getBranchList: () => unwrap<StockDocumentBranch[]>(axiosInstance.get(`${baseUrl}/list-branch-name`)),

  getEmployeeList: (branchId: number) =>
    unwrap<{ empId: number; empName: string }[]>(axiosInstance.get(`${baseUrl}/list-employee-name`, { params: { branchId } })),

  getProductListByName: (productName: string) =>
    unwrap<{ productId: number; productName: string; code: string; barcode: string }[]>(
      axiosInstance.get(`${baseUrl}/product-list-name`, { params: { productName } })
    ),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the form hooks read fields this API does not document
  getPurchaseCostData: (barcode: string) => unwrap<any>(axiosInstance.get(`${baseUrl}/product-cost-data/${barcode}`)),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- unit rows have a different shape per category
  getUnitList: (unitCategory: string) => unwrap<any[]>(axiosInstance.get(`${baseUrl}/unit-list-name`, { params: { unitCategory } })),

  getRefNumber: (branchId: number) => unwrap<{ refNo: number }>(axiosInstance.get(`${baseUrl}/ref-number/${branchId}`)),

  getDetails: (params: StockDocumentListParams) => {
    const cleanParams: StockDocumentListParams = {};
    if (params.BranchId !== undefined) cleanParams.BranchId = params.BranchId;
    if (params.FromDate) cleanParams.FromDate = formatDateOnly(params.FromDate);
    if (params.ToDate) cleanParams.ToDate = formatDateOnly(params.ToDate);
    if (params.RefNo) cleanParams.RefNo = params.RefNo;
    cleanParams.Decimals = params.Decimals ?? 3;
    return unwrap<StockDocumentRow[]>(axiosInstance.get(`${baseUrl}/details`, { params: cleanParams }));
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- each document has its own saved shape
  getById: (transId: number) => unwrap<any>(axiosInstance.get(`${baseUrl}/data/${transId}`)),

  cancel: (transId: number) => unwrap<unknown>(axiosInstance.put(`${baseUrl}/cancel/${transId}`)),
});
