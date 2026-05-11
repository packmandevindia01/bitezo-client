import type {
  PosCategory,
  PosProduct,
  PosQuickAction,
  PosTenderOption,
} from "./types";

export const POS_CATEGORIES: PosCategory[] = [];
export const POS_PRODUCTS: PosProduct[] = [];

export const POS_ORDER_TYPES: PosQuickAction[] = [
  { id: "dine-in", label: "Dine In" },
  { id: "takeaway", label: "Take Out" },
  { id: "drive-thru", label: "Drive Thru" },
  { id: "delivery", label: "Delivery" },
  { id: "preorder", label: "Preorder" },
];

export const POS_CART_ACTIONS: PosQuickAction[] = [
  { id: "void", label: "Void" },
  { id: "modify", label: "Mod" },
  { id: "extras", label: "Extra" },
  { id: "qty", label: "Qty" },
  { id: "price", label: "Price" },
];

export const POS_MORE_ACTIONS: PosQuickAction[] = [
  { id: "split", label: "Split" },
  { id: "combine", label: "Combine" },
  { id: "recall", label: "Recall" },
  { id: "more", label: "More" },
];

export const POS_TENDER_OPTIONS: PosTenderOption[] = [
  { id: "cash", label: "Cash" },
  { id: "card", label: "Card" },
  { id: "credit", label: "Credit" },
  { id: "multi", label: "Multi" },
];

export const POS_INITIAL_CART: any[] = [];
