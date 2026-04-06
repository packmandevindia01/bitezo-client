export interface ProductAlternative {
  id: number;
  branch: string;
  barcode: string;
  unit: string;
  price: string;
  altName: string;
  arabicName: string;
}

export interface ProductForm {
  productName: string;
  arabicName: string;
  productCode: string;
  category: string;
  subCategory: string;
  type: string;
  unit: string;
  pVat: string;
  sVat: string;
  cost: string;
  branch: string;
  note: string;
  isActive: boolean;
}

export interface ProductRecord extends ProductForm {
  id: number;
  alternatives: ProductAlternative[];
  image?: string;
}
