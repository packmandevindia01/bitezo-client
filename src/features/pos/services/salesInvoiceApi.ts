import axiosInstance from "../../../api/axiosInstance";
import { notifyTransactionsUpdated } from "../../../utils/transactionSync";

export interface ApiResponse<T = any> {
  isSuccess: boolean;
  message: string | null;
  data: T;
  errors?: Record<string, string[]>;
}

const unwrap = <T>(promise: Promise<{ data: ApiResponse<T> }>) => 
  promise.then(res => {
    if (!res.data.isSuccess) {
      throw new Error(res.data.message || "An unexpected error occurred");
    }
    return res.data.data;
  });

export interface SalesInvoicePayload {
  seriesId: number;
  prefix: string;
  customerId: number;
  paymodeId: number;
  employeeId: number;
  dayId: number;
  shiftId: number;
  transDate: string;
  orderTypeId: number;
  androidStatus: boolean;
  saleId?: number;
  orderId: number;
  voucherDate: string;
  discAmount: number;
  discPer: number;
  serviceCharge: number;
  levy: number;
  vatExclAmount: number;
  vatAmount: number;
  netAmount: number;
  deliveryCharge?: number;
  orderMaster: {
    isOrderEdited?: boolean;
    sectionId?: number;
    tableId?: number;
    guestNo?: number;
    vehicleCustomerName?: string;
    vehicleNo?: string;
    addressId?: number;
    missedCall?: boolean;
    contactNo?: string;
    note?: string;
    change?: string;
    isComing?: boolean;
    comingTime?: string;
    providerNo?: string;
    driverId?: number;
    transDate?: string;
  };
  combinedOrderIds?: number[];
  modifiers?: any[];
  voidProducts?: any[];
  voidModifiers?: any[];
  createdAt?: string;
  updateAt?: string;
  details: {
    productId: number;
    unitId: number;
    vatId: number;
    qty: number;
    price: number;
    discPer: number;
    discAmount: number;
    serviceCharge: number;
    levy: number;
    vatAmount: number;
    netAmount: number;
    baseQty: number;
    mapId: number;
    complimentaryStatus: boolean;
  }[];
  paymodes: {
    paymodeId: number;
    amount: number;
  }[];
}

export const salesInvoiceApi = {
  createSalesInvoice: async (payload: SalesInvoicePayload, maxRetries = 3): Promise<any> => {
    let lastError: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const postPayload: any = { ...payload };
        delete postPayload.saleId;
        delete postPayload.updateAt;
        delete postPayload.updatedAt;

        // Clean up fields not present in CreateSalesInvoiceDto
        delete postPayload.callBack;
        delete postPayload.complimentaryStatus;
        if (postPayload.orderMaster) {
          delete postPayload.orderMaster.complimentaryStatus;
          delete postPayload.orderMaster.callBack;
        }

        // Ensure voucherDate is strictly Date-Only (YYYY-MM-DD)
        if (postPayload.voucherDate) {
          postPayload.voucherDate = postPayload.voucherDate.includes("T")
            ? postPayload.voucherDate.split("T")[0]
            : postPayload.voucherDate;
        } else {
          postPayload.voucherDate = new Date().toISOString().split("T")[0];
        }

        const now = new Date();
        postPayload.createdAt = now.toISOString();

        if (!postPayload.transDate || postPayload.transDate.includes("T00:00:00") || !postPayload.transDate.includes("T") || attempt > 0) {
          const datePart = (postPayload.transDate || "").split("T")[0];
          if (datePart && /^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
            const [year, month, day] = datePart.split("-").map(Number);
            const combined = new Date();
            combined.setFullYear(year, month - 1, day);
            postPayload.transDate = combined.toISOString();
          } else {
            postPayload.transDate = now.toISOString();
          }
        }

        const data = await unwrap<any>(axiosInstance.post<ApiResponse<any>>('/sales-invoices', postPayload));
        notifyTransactionsUpdated("sale");
        return data ?? null;
      } catch (e: any) {
        lastError = e;
        const status = e?.response?.status;
        const rawMsg = String(e?.response?.data?.message || e?.response?.data?.title || e?.message || "");
        const isTicketConflict = (status === 409 || rawMsg.toLowerCase().includes("ticket")) &&
          (rawMsg.toLowerCase().includes("ticket") || rawMsg.toLowerCase().includes("exists") || rawMsg.toLowerCase().includes("try again"));

        if (isTicketConflict && attempt < maxRetries) {
          const delay = (attempt + 1) * 250;
          console.warn(`[salesInvoiceApi] Server returned: "${rawMsg}". Retrying sales invoice creation (attempt ${attempt + 1}/${maxRetries}) in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        console.error("Sales invoice creation failed:", e);
        throw e;
      }
    }

    throw lastError;
  },
  
  updateSalesInvoice: async (saleId: number, payload: SalesInvoicePayload): Promise<boolean> => {
    try {
      const numSaleId = Number(saleId);
      const voucherDateStr = payload.voucherDate
        ? (payload.voucherDate.includes("T") ? payload.voucherDate.split("T")[0] : payload.voucherDate)
        : new Date().toISOString().split("T")[0];

      const putPayload = {
        saleId: numSaleId,
        customerId: Number(payload.customerId || 1),
        paymodeId: Number(payload.paymodeId || 1),
        employeeId: Number(payload.employeeId || 1),
        orderTypeId: Number(payload.orderTypeId || 1),
        orderId: Number(payload.orderId || 0),
        voucherDate: voucherDateStr,
        discAmount: Number(payload.discAmount || 0),
        discPer: Number(payload.discPer || 0),
        serviceCharge: Number(payload.serviceCharge || 0),
        levy: Number(payload.levy || 0),
        vatExclAmount: Number(payload.vatExclAmount || 0),
        vatAmount: Number(payload.vatAmount || 0),
        deliveryCharge: Number(payload.deliveryCharge || 0),
        netAmount: Number(payload.netAmount || 0),
        updateAt: new Date().toISOString(),
        details: (payload.details || []).map((d: any) => ({
          productId: Number(d.productId || 0),
          unitId: Number(d.unitId || 1),
          vatId: Number(d.vatId || 1),
          qty: Number(d.qty || 0),
          price: Number(d.price || 0),
          discPer: Number(d.discPer || 0),
          discAmount: Number(d.discAmount || 0),
          serviceCharge: Number(d.serviceCharge || 0),
          levy: Number(d.levy || 0),
          vatAmount: Number(d.vatAmount || 0),
          netAmount: Number(d.netAmount || 0),
          baseQty: Number(d.baseQty || d.qty || 1),
          mapId: Number(d.mapId || 0),
          complimentaryStatus: Boolean(d.complimentaryStatus),
        })),
        paymodes: (payload.paymodes || []).map((p: any) => ({
          paymodeId: Number(p.paymodeId || 1),
          amount: Number(p.amount || 0),
        })),
        orderMaster: {
          isOrderEdited: Boolean(payload.orderMaster?.isOrderEdited ?? true),
          sectionId: Number(payload.orderMaster?.sectionId || 0),
          tableId: Number(payload.orderMaster?.tableId || 0),
          guestNo: Number(payload.orderMaster?.guestNo || 0),
          vehicleCustomerName: String(payload.orderMaster?.vehicleCustomerName || ""),
          vehicleNo: String(payload.orderMaster?.vehicleNo || ""),
          addressId: Number(payload.orderMaster?.addressId || 0),
          missedCall: Boolean(payload.orderMaster?.missedCall),
          contactNo: String(payload.orderMaster?.contactNo || ""),
          note: String(payload.orderMaster?.note || ""),
          change: String(payload.orderMaster?.change || ""),
          isComing: Boolean(payload.orderMaster?.isComing),
          comingTime: payload.orderMaster?.comingTime
            ? (payload.orderMaster.comingTime.includes("T") ? payload.orderMaster.comingTime : new Date(payload.orderMaster.comingTime).toISOString())
            : new Date().toISOString(),
          providerNo: String(payload.orderMaster?.providerNo || ""),
          driverId: Number(payload.orderMaster?.driverId || 0),
        },
        modifiers: (payload.modifiers || []).map((m: any) => ({
          mapId: Number(m.mapId || 0),
          modifierId: Number(m.modifierId || 0),
          qty: Number(m.qty || 0),
          price: Number(m.price || 0),
          amount: Number(m.amount || 0),
          typeId: Number(m.typeId || 1),
        })),
        voidProducts: (payload.voidProducts || []).map((vp: any) => ({
          productId: Number(vp.productId || 0),
          unitId: Number(vp.unitId || 1),
          qty: Number(vp.qty || 0),
          amount: Number(vp.amount || 0),
          mapId: Number(vp.mapId || 0),
        })),
        voidModifiers: (payload.voidModifiers || []).map((vm: any) => ({
          mapId: Number(vm.mapId || 0),
          modifierId: Number(vm.modifierId || 0),
          qty: Number(vm.qty || 0),
          amount: Number(vm.amount || 0),
          typeId: Number(vm.typeId || 1),
        })),
      };

      await unwrap<any>(axiosInstance.put<ApiResponse<any>>(`/sales-invoices/${numSaleId}`, putPayload));
      notifyTransactionsUpdated("sale");
      return true;
    } catch (e: any) {
      console.error("Sales invoice update failed:", e);
      throw e;
    }
  },

  getSalesInvoiceData: async (saleId: number, orderId: number): Promise<any> => {
    try {
      const data = await unwrap<any>(axiosInstance.get<ApiResponse<any>>(`/sales-invoices/sales-data/${saleId}/order/${orderId}`));
      return data;
    } catch (e: any) {
      console.error("Failed to fetch sales invoice data:", e);
      throw e;
    }
  }
};
