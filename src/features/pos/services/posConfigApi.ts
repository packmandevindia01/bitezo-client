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
  isRecipeEnable?: boolean;
  isDayDateEnable?: boolean;
  defaultOrderTypeId?: number;
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
  getOrderTypeList: async (): Promise<{ orderTypeId: number; orderTypeName: string }[]> => {
    try {
      const res = await axiosInstance.get<any>(`/pos-config/order-type-list-name`);
      const raw = Array.isArray(res.data) 
        ? res.data 
        : (Array.isArray(res.data?.data) ? res.data.data : []);
      
      const mapped = (raw || []).map((t: any) => {
        const id = t.orderTypeId ?? t.providerId ?? t.typeId ?? t.id ?? t.Id ?? t.OrderTypeId ?? 0;
        const name = t.orderTypeName ?? t.providerName ?? t.typeName ?? t.orderType ?? t.name ?? t.OrderTypeName ?? t.OrderType ?? t.Name ?? "";
        return {
          orderTypeId: Number(id) || 0,
          orderTypeName: String(name || "").trim()
        };
      }).filter((t: any) => t.orderTypeName !== "" && t.orderTypeId > 0);

      if (mapped.length > 0) return mapped;
    } catch (err) {
      console.warn("Failed to fetch order types from /pos-config/order-type-list-name:", err);
    }

    return [
      { orderTypeId: 1, orderTypeName: "Dine In" },
      { orderTypeId: 2, orderTypeName: "Take Out" },
      { orderTypeId: 3, orderTypeName: "Drive Thru" },
      { orderTypeId: 4, orderTypeName: "Delivery" },
      { orderTypeId: 6, orderTypeName: "Coming" },
    ];
  },
  updatePosConfig: async (data: PosConfigUpdatePayload): Promise<any> => {
    const res = await axiosInstance.put(`/pos-config`, data);
    return res.data;
  },
};
