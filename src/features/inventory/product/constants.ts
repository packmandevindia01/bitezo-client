import type { ProductFormState, AltProductDraft } from "./types";

export const productTypeOptions = [
  { label: "Standard", value: "1" },
  { label: "Combo", value: "2" },
  { label: "Add On", value: "3" },
];

export const emptyForm: ProductFormState = {
  code: "",
  name: "",
  arabicName: "",
  categoryId: "",
  subCatId: "",
  groupId: "",
  typeId: "1",
  unitId: "",
  pVatId: "",
  sVatId: "",
  cost: "0",
  branchId: "",
  isActive: true,
  colorCode: "#49293e",
  productColors: [],
};

export const emptyAltDraft: Omit<AltProductDraft, "id"> = {
  unitId: 0,
  barcode: "",
  isIncl: true,
  price: "0",
  altName: "",
  altArabic: "",
  branchId: 0,
};

/** Mock data for UI development if API is offline */
export const initialProducts = [];
