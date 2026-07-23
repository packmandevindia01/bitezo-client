import type { ProductFormData, AltProductDraft } from "./schema/productSchema";

export const productTypeOptions = [
  { label: "Standard", value: "1" },
  { label: "Combo", value: "2" },
  { label: "Add On", value: "3" },
];

export const emptyForm: ProductFormData = {
  code: "",
  name: "",
  arabicName: "",
  categoryId: "",
  subCatId: "",
  branchId: "",
  groupId: "",
  typeId: "1",
  unitId: "",
  pVatId: "",
  sVatId: "",
  cost: "0",
  price: "0",
  barcode: "",
  isActive: true,
  priceIsIncl: true,
  colorCode: "#49293e",
  altProducts: [],
  productColors: [],
};

export const emptyAltDraft: Omit<AltProductDraft, "id"> = {
  unitId: "",
  barcode: "",
  isIncl: true,
  price: "0",
  altName: "",
  altArabic: "",
  branchId: "",
};

/** Mock data for UI development if API is offline */
export const initialProducts = [];
