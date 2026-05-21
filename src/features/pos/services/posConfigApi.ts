import axiosInstance from "../../../api/axiosInstance";

export interface RuntimePosConfig {
  defaultEmployee?: "Enable" | "Disable" | string;
  employeeId?: number;
}

export interface PosConfigResponseData {
  configs: RuntimePosConfig;
  deliverycharges: unknown;
}

export interface PosConfigResponse {
  data: PosConfigResponseData;
  status: number;
  message: string;
  correlationId?: string;
  errors?: string[];
  isSuccess: boolean;
}

export const POS_CONFIGS_STORAGE_KEY = "posConfigs";

export const posConfigApi = {
  getPosConfig: async (branchId: number): Promise<PosConfigResponse> => {
    const res = await axiosInstance.get<PosConfigResponse>(`/pos-config/${branchId}/pos-config-data`);
    return res.data;
  },
};
