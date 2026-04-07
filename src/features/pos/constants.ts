import type {
  PosCategory,
  PosProduct,
  PosQuickAction,
  PosTenderOption,
} from "./types";

export const POS_CATEGORIES: PosCategory[] = [
  { id: "juice", name: "Juice", description: "Fresh blends and seasonal crushes" },
  { id: "coffee", name: "Coffee", description: "Espresso, latte, and cold brew" },
  { id: "tea", name: "Tea", description: "Herbal, milk, and iced tea options" },
  { id: "snacks", name: "Snacks", description: "Fast moving savory add-ons" },
  { id: "dessert", name: "Dessert", description: "Pastries, cakes, and sweet bites" },
  { id: "combos", name: "Combos", description: "Bundles for dine-in and takeaway" },
  { id: "specials", name: "Specials", description: "High-margin chef recommendations" },
];

export const POS_PRODUCTS: PosProduct[] = [
  { id: 1, name: "Orange Burst", categoryId: "juice", price: 180, sku: "JU-101", prepTime: "4 min", bestseller: true },
  { id: 2, name: "Green Detox", categoryId: "juice", price: 210, sku: "JU-102", prepTime: "5 min" },
  { id: 3, name: "Watermelon Chill", categoryId: "juice", price: 195, sku: "JU-103", prepTime: "4 min" },
  { id: 4, name: "Pineapple Mint", categoryId: "juice", price: 220, sku: "JU-104", prepTime: "5 min" },
  { id: 5, name: "Apple Spark", categoryId: "juice", price: 170, sku: "JU-105", prepTime: "4 min" },
  { id: 6, name: "Cold Brew", categoryId: "coffee", price: 160, sku: "CF-201", prepTime: "3 min", bestseller: true },
  { id: 7, name: "Cafe Latte", categoryId: "coffee", price: 190, sku: "CF-202", prepTime: "4 min" },
  { id: 8, name: "Mocha Frappe", categoryId: "coffee", price: 240, sku: "CF-203", prepTime: "6 min" },
  { id: 9, name: "Masala Chai", categoryId: "tea", price: 90, sku: "TE-301", prepTime: "3 min", bestseller: true },
  { id: 10, name: "Iced Lemon Tea", categoryId: "tea", price: 130, sku: "TE-302", prepTime: "3 min" },
  { id: 11, name: "Paneer Puff", categoryId: "snacks", price: 85, sku: "SN-401", prepTime: "2 min" },
  { id: 12, name: "Loaded Nachos", categoryId: "snacks", price: 210, sku: "SN-402", prepTime: "7 min" },
  { id: 13, name: "Chocolate Slice", categoryId: "dessert", price: 145, sku: "DS-501", prepTime: "2 min" },
  { id: 14, name: "Berry Cheesecake", categoryId: "dessert", price: 230, sku: "DS-502", prepTime: "2 min" },
  { id: 15, name: "Morning Combo", categoryId: "combos", price: 275, sku: "CB-601", prepTime: "6 min" },
  { id: 16, name: "Family Treat Box", categoryId: "specials", price: 540, sku: "SP-701", prepTime: "10 min" },
];

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

export const POS_INITIAL_CART = [
  { productId: 1, quantity: 2 },
  { productId: 6, quantity: 1 },
  { productId: 11, quantity: 3 },
];
