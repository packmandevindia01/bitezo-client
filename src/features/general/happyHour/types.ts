export interface HappyHourListItem {
  promotionId: number;
  promotionName: string;
  validFrom: string;
  validTo: string;
  branch: string;
}

export interface HappyHourEntry {
  productId: number;
  unitId: number;
  productName: string;
  barcode: string;
  altName: string;
  price: number;
  discountPercentage: number;
  discountValue: number;
  promoPrice: number;
  isIncl: boolean;
}

export interface HappyHourPayload {
  promotionId?: number;
  promotionName: string;
  branchId: number;
  validFrom: string;
  validTo: string;
  createdAt?: string;
  updatedAt?: string;
  details: {
    productId: number;
    unitId: number;
    isIncl: boolean;
    originalPrice: number;
    discountPer: number;
    discount: number;
    promoPrice: number;
  }[];
}

export interface HappyHourData {
  master: {
    promotionId: number;
    promotionName: string;
    branchId: number;
    validFrom: string;
    validTo: string;
    createdAt?: string;
    updatedAt?: string;
  };
  details: {
    productId: number;
    unitId: number;
    product: string;
    barcode: string;
    altName: string;
    isIncl: boolean;
    originalprice: number;
    discountPer: number;
    discount: number;
    promoPrice: number;
  }[];
}
