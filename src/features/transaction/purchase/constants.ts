import type { PurchaseTransactionForm } from "./types";

const today = () => new Date().toISOString().slice(0, 10);

export const createEmptyPurchaseTransactionForm = (): PurchaseTransactionForm => ({
  series: "",
  purchaseNo: "",
  purchaseDate: today(),
  invoiceNo: "",
  invoiceDate: today(),
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
  discAmount: "",
  paymode: "",
  narration: "",
  otherCharge: "0.000",
  roundOff: "0.000",
});
