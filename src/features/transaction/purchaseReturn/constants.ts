import { toLocalDateString } from "../../../utils/date";

export const createEmptyPurchaseReturnForm = (): any => ({
  series: "",
  purchaseNo: "",
  purchaseDate: toLocalDateString(),
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
