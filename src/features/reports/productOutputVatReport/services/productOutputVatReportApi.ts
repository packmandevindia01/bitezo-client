import { unwrapResponse as unwrap } from "@shared/api/unwrap";
import axiosInstance from "../../../../api/axiosInstance";
import type {
  ProductOutputVatReportParams,
  ProductOutputVatReportResponse,
  BranchOption,
  ProductOption,
  VatOption,
} from "../types";
import { assertReportSuccess } from "../../framework/reportResponse";


export const getProductOutputVatReport = async (
  params: ProductOutputVatReportParams
): Promise<ProductOutputVatReportResponse["data"]> => {
  const queryParams: Record<string, any> = {
    BranchId: params.BranchId,
    FromDate: params.FromDate,
    ToDate: params.ToDate,
    Decimals: params.Decimals,
  };

  if (params.productId && Number(params.productId) > 0) {
    queryParams.productId = params.productId;
  }

  if (params.vatId && Number(params.vatId) > 0) {
    queryParams.vatId = params.vatId;
  }

  const response = await axiosInstance.get("/reports/product-output-vat-report", {
    params: queryParams,
  });
  assertReportSuccess(response.data);
  return unwrap(response);
};

export const getBranchList = async (): Promise<BranchOption[]> => {
  const response = await axiosInstance.get("/Branch/true/list-name");
  return unwrap(response);
};

export const getProductList = async (): Promise<ProductOption[]> => {
  const response = await axiosInstance.get("/product/list-name", {
    params: {
      productName: "",
    },
  });
  return unwrap(response);
};

export const getVatList = async (): Promise<VatOption[]> => {
  const response = await axiosInstance.get("/vat/vat-list");
  return unwrap(response);
};
