import axiosInstance from "../../../api/axiosInstance";
import { notifyTransactionsUpdated } from "../../../utils/transactionSync";
import { sanitizeTaxExclusiveDetail, roundCalc, getVatStatus } from "../terminal/utils/billing";

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
  complimentaryStatus?: boolean;
  billDiscount?: number;
  billDiscountValue?: number;
  billDiscountType?: 'percentage' | 'amount';
  isBillDiscount?: boolean;
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

        // The paymodes array should only contain data when paymode is 3 (Multi). Otherwise, it should be empty.
        if (Number(postPayload.paymodeId) !== 3) {
          postPayload.paymodes = [];
        } else if (!Array.isArray(postPayload.paymodes)) {
          postPayload.paymodes = [];
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

        if (postPayload.details && Array.isArray(postPayload.details)) {
          // Skip re-sanitization for details already marked as tax-exclusive (to prevent double-division by VAT)
          postPayload.details = postPayload.details.map((d: any) => d.isPriceTaxExclusive === true ? d : sanitizeTaxExclusiveDetail(d));
          const totalModifierGross = Array.isArray(postPayload.modifiers)
            ? postPayload.modifiers.reduce((sum: number, m: any) => sum + Number(m.amount !== undefined ? m.amount : (Number(m.price || 0) * Number(m.qty || 1))), 0)
            : 0;
          const lineExclSum = postPayload.details.reduce(
            (sum: number, d: any) => sum + (Number(d.price || 0) * Number(d.qty || 1) - Number(d.discAmount || 0) + Number(d.serviceCharge || 0) + Number(d.levy || 0)),
            0
          );
          const lineDiscounts = postPayload.details.reduce((sum: number, d: any) => sum + Number(d.discAmount || 0), 0);
          const isBillDisc = Boolean(
            (postPayload as any).isBillDiscount ||
            Number((postPayload as any).billDiscountValue || (postPayload as any).billDiscount || 0) > 0 ||
            (Number(postPayload.discAmount || 0) > 0 && lineDiscounts === 0)
          );

          if (isBillDisc) {
            postPayload.details.forEach((d: any) => {
              d.discAmount = 0;
              d.discPer = 0;
            });
            postPayload.discAmount = roundCalc(Number(postPayload.discAmount || 0));
          } else {
            postPayload.discAmount = 0;
            postPayload.discPer = 0;
          }

          let calcVatExcl = roundCalc(lineExclSum + totalModifierGross);
          let calcVatAmt = roundCalc(postPayload.details.reduce((sum: number, d: any) => sum + Number(d.vatAmount || 0), 0));
          const isVatEnabled = getVatStatus();
          const payableBase = Math.max(0, Number(postPayload.netAmount || 0) - Number(postPayload.deliveryCharge || 0));

          // If incoming payload already has mathematically sound vatExclAmount + vatAmount matching payableBase, preserve them
          const incomingVatExcl = Number(postPayload.vatExclAmount || 0);
          const incomingVatAmt = Number(postPayload.vatAmount || 0);
          if (incomingVatExcl > 0 && incomingVatAmt > 0 && Math.abs((incomingVatExcl + incomingVatAmt) - payableBase) < 0.05) {
            postPayload.vatExclAmount = incomingVatExcl;
            postPayload.vatAmount = incomingVatAmt;
          } else {
            if (isVatEnabled && !postPayload.complimentaryStatus && payableBase > calcVatExcl) {
              const reconciledVat = roundCalc(payableBase - calcVatExcl);
              if (reconciledVat > calcVatAmt) {
                calcVatAmt = reconciledVat;
              }
            } else if (isVatEnabled && calcVatAmt <= 0.0001 && payableBase > 0 && !postPayload.complimentaryStatus) {
              const vatRate = 0.10;
              calcVatAmt = roundCalc(payableBase - (payableBase / (1 + vatRate)));
              calcVatExcl = roundCalc(payableBase - calcVatAmt);
            }
            postPayload.vatExclAmount = calcVatExcl;
            postPayload.vatAmount = calcVatAmt;
          }
        }

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

      const cleanedDetails = (payload.details || []).map((d: any) => {
        // Skip re-sanitization for details already marked as tax-exclusive (to prevent double-division by VAT)
        const sanitized = d.isPriceTaxExclusive === true ? d : sanitizeTaxExclusiveDetail(d);
        return {
          productId: Number(sanitized.productId || 0),
          unitId: Number(sanitized.unitId || 1),
          vatId: Number(sanitized.vatId || 1),
          qty: Number(sanitized.qty || 0),
          price: sanitized.price,
          discPer: Number(sanitized.discPer || 0),
          discAmount: sanitized.discAmount,
          serviceCharge: sanitized.serviceCharge,
          levy: sanitized.levy,
          vatAmount: sanitized.vatAmount,
          netAmount: sanitized.netAmount,
          baseQty: Number(sanitized.baseQty || sanitized.qty || 1),
          mapId: Number(sanitized.mapId || 0),
          complimentaryStatus: Boolean(sanitized.complimentaryStatus),
        };
      });

      const totalModifierGross = (payload.modifiers || []).reduce((sum: number, m: any) => sum + Number(m.amount !== undefined ? m.amount : (Number(m.price || 0) * Number(m.qty || 1))), 0);
      const lineExclSum = cleanedDetails.reduce(
        (sum, d) => sum + (Number(d.price || 0) * Number(d.qty || 1) - Number(d.discAmount || 0) + Number(d.serviceCharge || 0) + Number(d.levy || 0)),
        0
      );
      const lineDiscounts = cleanedDetails.reduce((sum, d) => sum + Number(d.discAmount || 0), 0);
      const isBillDisc = Boolean(
        (payload as any).isBillDiscount ||
        Number((payload as any).billDiscountValue || (payload as any).billDiscount || 0) > 0 ||
        (Number(payload.discAmount || 0) > 0 && lineDiscounts === 0)
      );

      if (isBillDisc) {
        cleanedDetails.forEach((d: any) => {
          d.discAmount = 0;
          d.discPer = 0;
        });
        payload.discAmount = roundCalc(Number(payload.discAmount || 0));
      } else {
        payload.discAmount = 0;
        payload.discPer = 0;
      }

      let calcVatExcl = roundCalc(lineExclSum + totalModifierGross);
      let calcVatAmt = roundCalc(cleanedDetails.reduce((sum, d) => sum + Number(d.vatAmount || 0), 0));
      const isVatEnabled = getVatStatus();
      const payableBase = Math.max(0, Number(payload.netAmount || 0) - Number(payload.deliveryCharge || 0));

      const incomingVatExcl = Number(payload.vatExclAmount || 0);
      const incomingVatAmt = Number(payload.vatAmount || 0);
      if (incomingVatExcl > 0 && incomingVatAmt > 0 && Math.abs((incomingVatExcl + incomingVatAmt) - payableBase) < 0.05) {
        calcVatExcl = incomingVatExcl;
        calcVatAmt = incomingVatAmt;
      } else {
        if (isVatEnabled && !payload.complimentaryStatus && payableBase > calcVatExcl) {
          const reconciledVat = roundCalc(payableBase - calcVatExcl);
          if (reconciledVat > calcVatAmt) {
            calcVatAmt = reconciledVat;
          }
        } else if (isVatEnabled && calcVatAmt <= 0.0001 && payableBase > 0 && !payload.complimentaryStatus) {
          const vatRate = 0.10;
          calcVatAmt = roundCalc(payableBase - (payableBase / (1 + vatRate)));
          calcVatExcl = roundCalc(payableBase - calcVatAmt);
        }
      }

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
        vatExclAmount: calcVatExcl,
        vatAmount: calcVatAmt,
        deliveryCharge: Number(payload.deliveryCharge || 0),
        netAmount: Number(payload.netAmount || 0),
        updateAt: new Date().toISOString(),
        details: cleanedDetails,
        paymodes: Number(payload.paymodeId) === 3
          ? (payload.paymodes || []).map((p: any) => ({
              paymodeId: Number(p.paymodeId || 1),
              amount: Number(p.amount || 0),
            }))
          : [],
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
