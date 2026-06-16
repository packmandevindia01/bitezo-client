import type { ConfigurationState, BackofficeConfigState } from "./types";

export const INITIAL_CONFIG: ConfigurationState = {
  companyCode: "",
  companyNameKOT: false,
  locationWisePrice: false,
  alternativeOrder: "Name",
  defaultEmployee: false,
  employeeId: "",
  groupInMenu: false,
  packagerHeader: false,
  enableVat: false,
  
  discCalc: "Exclusive",
  kotHeader: "QTY,DESCRIPTION",
  kotArabic: false,
  billArabic: false,
  kotPrintSettle: false,
  billCopies: 1,
  packagerPrint: false,
  kotPrint: true,
  masterKot: false,
  masterKotBillPrinter: false,
  itemSeparationAfterEdit: false,
  printPrice: "Inclusive",
  colorChangeGuestPrint: false,

  callerIdPort: "",
  displayPort: "",
  priceView: "Exclusive",
  cashdrawer: "Default",
  recipe: false,
  multiEmployeeTable: false,
  customerTakeout: false,
  deliverySettle: false,
  showDeliveryRecall: false,
  providerOwnMenuStatus: false,

  serviceCharge: 0,
  levy: 0,
  defaultDeliveryCharge: 0,
  multiDeliveryCharges: [],

  dayEnd: {
    category: false,
    voucherEntry: false,
    orderType: false,
    employee: false,
    voidItem: false,
    denomination: false,
    product: false,
    group: false,
    driver: false,
  },
};


export const INITIAL_BACKOFFICE_CONFIG: BackofficeConfigState = {
  // SelectInput fields
  defaultProductType: "",
  defaultVat: "",
  stockValueMethod: "AverageCost",
  updateLndCostType: "All",
  discountCalculation: "Exclusive",

  // Toggle fields
  vatStatus: false,
  advancedProductSearch: false,
  displayAllUnits: false,
  updateLndCost: false,
  supplierProductsInPurchase: false,
  autoUpdateSupplier: false,
  barcodeView: false,
};
