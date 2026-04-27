export interface DeliveryCharge {
  id: string;
  name: string;
  charge: number;
}

export interface ConfigurationState {
  // General POS Settings
  companyNameKOT: boolean;
  locationWisePrice: boolean;
  alternativeOrder: "Id" | "Name" | "Price";
  packagerHeader: boolean;
  
  // Printing & KOT
  discCalc: "Inclusive" | "Exclusive";
  kotHeader: "QTY,DESCRIPTION" | "QTY,DESCRIPTION,AMT" | "DESCRIPTION,QTY,AMT";
  kotArabic: boolean;
  billArabic: boolean;
  kotPrintSettle: boolean;
  billCopies: number;
  packagerPrint: boolean;
  kotPrint: boolean;
  masterKot: boolean;
  masterKotBillPrinter: boolean;
  itemSeparationAfterEdit: boolean;
  printPrice: "Inclusive" | "Exclusive";
  colorChangeGuestPrint: boolean;

  // Operational Settings
  callerIdPort: string;
  displayPort: string;
  priceView: "Inclusive" | "Exclusive";
  cashdrawer: "Default" | "Normal";
  recipe: boolean;
  multiEmployeeTable: boolean;
  customerTakeout: boolean;
  deliverySettle: boolean;
  showDeliveryRecall: boolean;

  // Charges
  serviceCharge: number;
  levy: number;
  defaultDeliveryCharge: number;
  multiDeliveryCharges: DeliveryCharge[];

  // Day End Flags
  dayEnd: {
    category: boolean;
    voucherEntry: boolean;
    orderType: boolean;
    employee: boolean;
    voidItem: boolean;
    denomination: boolean;
    product: boolean;
    group: boolean;
    driver: boolean;
  };
}
