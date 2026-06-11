import axiosInstance from "../../../api/axiosInstance";
import type { LoginResponse } from "../types";

export interface PosMasterDataResponse {
  company: {
    decimalPart: number;
    currencySymbol: string;
  };
  configs: {
    configs: Record<string, any>;
    deliverycharges: any;
  };
  voucherSeries: {
    seriesName: string;
    prefix: string;
  };
  printerData: {
    generalPrinter: Record<string, any>;
    productPrinter: any[];
    categoryPrinter: any[];
    sectionPrinter: any[];
    ordertypePrinter: any[];
  };
}

export const loginApi = async (username: string, password: string): Promise<LoginResponse> => {
  const url = `/auth/login`;
  
  const { data } = await axiosInstance.post<LoginResponse>(
    url,
    { username, password }
  );

  return data;
};

export const posLoginApi = async (
  password: string, 
  branchId: number, 
  counterId: number,
  seriesId: number
): Promise<LoginResponse> => {
  const url = `/auth/pos-login`;
  
  const { data } = await axiosInstance.post<LoginResponse>(
    url,
    { password, branchId, counterId, seriesId }
  );

  return data;
};

export const fetchPosMasterDataApi = async (
  terminalId: number | string,
  seriesId: number | string
): Promise<PosMasterDataResponse> => {
  const url = `/Branch/load-pos-master-data?seriesId=${seriesId}`;
  
  const { data } = await axiosInstance.get<PosMasterDataResponse>(url, {
    headers: {
      terminalId: terminalId.toString()
    }
  });

  return data;
};
