import axios from "axios";
import axiosInstance from "../../../api/axiosInstance";
import { getConfig } from "../../../config";
import type { LoginResponse, RefreshTokenResponse } from "../types";

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

export const backofficeRefreshTokenApi = async (
  accessToken: string
): Promise<RefreshTokenResponse> => {
  const baseURL = getConfig().apiBaseUrl;
  const tenantId = localStorage.getItem("tenantId") || "bitezo_db";

  const response = await axios.post<RefreshTokenResponse | { data: RefreshTokenResponse }>(
    `${baseURL}/auth/backoffice-refresh-token`,
    {},
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        clientDb: tenantId,
        Accept: "*/*",
      },
    }
  );

  const resData = response.data;
  if (resData && typeof resData === "object" && "data" in resData && (resData as any).data?.accessToken) {
    return (resData as any).data as RefreshTokenResponse;
  }
  return resData as RefreshTokenResponse;
};

export const posRefreshTokenApi = async (
  accessToken: string
): Promise<RefreshTokenResponse> => {
  const baseURL = getConfig().apiBaseUrl;
  const tenantId = localStorage.getItem("tenantId") || "bitezo_db";

  const response = await axios.post<RefreshTokenResponse | { data: RefreshTokenResponse }>(
    `${baseURL}/auth/pos-refresh-token`,
    {},
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        clientDb: tenantId,
        Accept: "*/*",
      },
    }
  );

  const resData = response.data;
  if (resData && typeof resData === "object" && "data" in resData && (resData as any).data?.accessToken) {
    return (resData as any).data as RefreshTokenResponse;
  }
  return resData as RefreshTokenResponse;
};

