import type { PurchaseReturnForm } from "./types";

export const createEmptyPurchaseReturnForm = (): PurchaseReturnForm => ({
  series: "",
  purchaseNo: "",
  purchaseDate: new Date().toISOString().split("T")[0],
  invoiceNo: "",
  refNo: "",
  invoiceDate: new Date().toISOString().split("T")[0],
  supplier: "",
  branch: "",
  salesman: "",
  
  product: "",
  code: "",
  unit: "",
  qty: "0",
  foc: "0",
  price: "0",
  vatId: "0",
  vatPercent: "0",
  discPercent: "0",
  
  globalDiscPercent: "0",
  discAmount: "0",
  narration: "",
  otherCharge: "0",
  roundOff: "0",
});
