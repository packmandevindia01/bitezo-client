export interface GeneralPrinterSettings {
  billPrinter: string;
  kotPrinter: string;
  packagerPrinter: string;
  masterKOT: string;
  masterKOTCount: number;
  masterKOTBillCount: number;
  androidPrint?: boolean;
  androidBillPrinter?: string;
  androidKOTPrinter?: string;
  androidPackagerPrinter?: string;
}

export interface PrinterIpMapItem {
  id?: number;
  ipAddress: string;
  printerName: string;
}

export interface CategoryPrinterSetting {
  categoryId: number;
  category?: string;
  firstPrinter: string;
  secondPrinter: string;
}

export interface ProductPrinterSetting {
  productId: number;
  product?: string;
  firstPrinter: string;
  secondPrinter: string;
}

export interface SectionPrinterSetting {
  sectionId: number;
  section?: string;
  firstPrinter: string;
  secondPrinter: string;
}

export interface OrderTypePrinterSetting {
  orderTypeId?: number;
  orderType: string;
  printer: string;
}

export interface PrinterDataResponse {
  generalPrinter: GeneralPrinterSettings;
  productPrinter: ProductPrinterSetting[];
  categoryPrinter: CategoryPrinterSetting[];
  sectionPrinter: SectionPrinterSetting[];
  ordertypePrinter: OrderTypePrinterSetting[];
}
