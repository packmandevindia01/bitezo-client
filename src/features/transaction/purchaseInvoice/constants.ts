import type { PurchaseInvoiceForm } from "./types";

export const createEmptyPurchaseInvoiceForm = (): PurchaseInvoiceForm => ({
  series: "",
  purchaseNo: "",
  purchaseDate: new Date().toISOString().split("T")[0],
  invoiceNo: "",
  invoiceDate: new Date().toISOString().split("T")[0],
  supplier: "",
  branch: "",
  salesman: "",
  
  product: "",
  code: "",
  unit: "",
  qty: "0",
  foc: "0",
  price: "0.000",
  vatPercent: "0",
  discPercent: "0",
  
  discAmount: "0.000",
  paymode: "Cash",
  narration: "",
  otherCharge: "0.000",
  roundOff: "0.000",
});
