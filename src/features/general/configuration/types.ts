export interface DeliveryCharge {
  id: string;
  name: string;
  charge: number;
}

export interface ConfigurationState {
  // General POS Settings
  companyCode: string;
  enableVat?: boolean;
  companyNameKOT: boolean;
  locationWisePrice: boolean;
  alternativeOrder: "Id" | "Name" | "Price";
  defaultEmployee: boolean;
  employeeId: string;
  groupInMenu: boolean;
  packagerHeader: boolean;
  
  // Printing & KOT
  discCalc: "Inclusive" | "Exclusive";
  kotHeader: "QTY,DESCRIPTION" | "QTY,DESCRIPTION,AMT" | "DESCRIPTION,QTY,AMT";
  kotArabic: boolean;
  billArabic: boolean;
  kotPrintSettle: boolean;
  billCopies: number | string;
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
  providerOwnMenuStatus: boolean;

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

export interface BackofficeConfigState {
  // SelectInput — multi-option fields
  defaultProductType: string;        // From API (placeholder options for now)
  defaultVat: string;                // From API (placeholder options for now)
  stockValueMethod: "AverageCost" | "LastPurchase" | "FIFO";
  updateLndCostType: "All" | "Barcode" | "Unit";
  discountCalculation: "Inclusive" | "Exclusive";

  // Checkbox (Toggle) — Enable/Disable fields
  vatStatus: boolean;
  advancedProductSearch: boolean;
  displayAllUnits: boolean;
  updateLndCost: boolean;
  supplierProductsInPurchase: boolean;
  autoUpdateSupplier: boolean;
  barcodeView: boolean;
}
