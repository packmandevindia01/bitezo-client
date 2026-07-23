
export const createEmptyPurchaseReturnForm = (): any => ({
  series: "",
  purchaseNo: "",
  purchaseDate: new Date().toISOString().split("T")[0],
  invoiceNo: "",
  refNo: "",
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
