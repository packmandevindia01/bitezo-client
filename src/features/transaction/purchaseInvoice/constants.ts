import type { PurchaseInvoiceForm } from "./types";

export const createEmptyPurchaseInvoiceForm = (): PurchaseInvoiceForm => ({
  series: "",
  purchaseNo: "",
  purchaseDate: new Date().toISOString().split("T")[0],
  invoiceNo: "",
  refNo: "",
  invoiceDate: new Date().toISOString().split("T")[0],
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
