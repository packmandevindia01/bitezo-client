import type { PurchaseInvoiceForm } from "./types";

import { toLocalDateString } from "../../../utils/date";
export const createEmptyPurchaseInvoiceForm = (): PurchaseInvoiceForm => ({
  series: "",
  purchaseNo: "",
  purchaseDate: toLocalDateString(),
  invoiceNo: "",
  refNo: "",
  invoiceDate: toLocalDateString(),
  supplier: "",
  branch: "",
  salesman: "",
  
  items: [],
  payments: [],
  
  globalDiscPercent: "0",
  discAmount: "0",
  narration: "",
  otherCharge: "0",
  roundOff: "0",
});
