import axiosInstance from "../../../api/axiosInstance";

export const POS_CONFIGS_STORAGE_KEY = "posConfigs";

export interface PosConfigDeliveryCharge {
  chargeName: string;
  chargeValue: number;
}

export interface RuntimePosConfig {
  discountCalc?: string;
  kotHeader?: string;
  kotArabic?: string;
  billArabic?: string;
  kotPrintSettle?: string;
  billCopies?: number;
  packagerPrint?: string;
  callerIdPort?: string;
  priceView?: string;
  cashdrawer?: string;
  recipe?: string;
  dayDate?: string;
  DayDate?: string;
  itemSeperationEdit?: string;
  multiEmployeeTable?: string;
  customerTakeout?: string;
  kotPrint?: string;
  displayPort?: string;
  printPrice?: string;
  deliverySettle?: string;
  showDeliveryRecall?: string;
  colorChangeGuestPrint?: string;
  masterKot?: string;
  masterKotBillPrinter?: string;
  companyNameKot?: string;
  locationWisePrice?: string;
  alternativeOrder?: string;
  packagerHeader?: string;
  categoryDayend?: string;
  voucherEntryDayend?: string;
  orderTypeDayend?: string;
  employeeDayend?: string;
  voidItemDayend?: string;
  denominationDayend?: string;
  productDayend?: string;
  groupDayend?: string;
  driverDayend?: string;
  serviceCharges?: number;
  levy?: number;
  deliveryCharge?: number;
  defaultEmployee?: string;
  employeeId?: number;
  showGroup?: string;
  providerOwnStatus?: boolean;
}

export interface PosConfigResponseData {
  configs: RuntimePosConfig;
  deliverycharges: { chargeName: string; chargeValue: number }[] | null;
}

export interface PosConfigResponse {
  data: PosConfigResponseData;
  status: number;
  message: string;
  correlationId?: string;
  errors?: string[];
  isSuccess: boolean;
}

export interface PosConfigUpdatePayload extends RuntimePosConfig {
  branchId: number;
  deliveryCharges: PosConfigDeliveryCharge[];
}

export const posConfigApi = {
  getPosConfig: async (branchId: number): Promise<PosConfigResponse> => {
    const res = await axiosInstance.get<PosConfigResponse>(`/pos-config/${branchId}/pos-config-data`);
    return res.data;
  },
  updatePosConfig: async (data: PosConfigUpdatePayload): Promise<any> => {
    const res = await axiosInstance.put(`/pos-config`, data);
    return res.data;
  },
};
