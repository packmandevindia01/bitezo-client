import type { ProductAlternative, ProductForm, ProductRecord } from "./types";

export const productCategoryOptions = [
  { label: "Food", value: "Food" },
  { label: "Beverage", value: "Beverage" },
  { label: "Retail", value: "Retail" },
];

export const productSubCategoryOptions = [
  { label: "Burger", value: "Burger" },
  { label: "Cold Drinks", value: "Cold Drinks" },
  { label: "Bakery", value: "Bakery" },
];

export const productTypeOptions = [
  { label: "Standard", value: "Standard" },
  { label: "Combo", value: "Combo" },
  { label: "Add On", value: "Add On" },
];

export const productUnitOptions = [
  { label: "Piece", value: "Piece" },
  { label: "Box", value: "Box" },
  { label: "Cup", value: "Cup" },
];

export const productBranchOptions = [
  { label: "Main Branch", value: "Main Branch" },
  { label: "Airport Branch", value: "Airport Branch" },
  { label: "Mall Branch", value: "Mall Branch" },
];

export const emptyProductForm: ProductForm = {
  productName: "",
  arabicName: "",
  productCode: "",
  category: "",
  subCategory: "",
  type: "",
  unit: "",
  pVat: "",
  sVat: "",
  cost: "",
  branch: "",
  note: "",
  isActive: true,
};

export const emptyAlternative: Omit<ProductAlternative, "id"> = {
  branch: "",
  barcode: "",
  unit: "",
  price: "",
  altName: "",
  arabicName: "",
};

export const initialProducts: ProductRecord[] = [
  {
    id: 1,
    productName: "Classic Burger",
    arabicName: "برجر كلاسيك",
    productCode: "PRD-1001",
    category: "Food",
    subCategory: "Burger",
    type: "Standard",
    unit: "Piece",
    pVat: "5",
    sVat: "5",
    cost: "1.20",
    branch: "Main Branch",
    note: "stock tracked",
    isActive: true,
    alternatives: [
      {
        id: 11,
        branch: "Mall Branch",
        barcode: "1234567890123",
        unit: "Piece",
        price: "3.00",
        altName: "Classic Burger Mall",
        arabicName: "برجر كلاسيك مول",
      },
    ],
  },
  {
    id: 2,
    productName: "Lemon Soda",
    arabicName: "صودا ليمون",
    productCode: "PRD-2010",
    category: "Beverage",
    subCategory: "Cold Drinks",
    type: "Standard",
    unit: "Cup",
    pVat: "5",
    sVat: "5",
    cost: "0.75",
    branch: "Airport Branch",
    note: "avg cost",
    isActive: false,
    alternatives: [],
  },
];
