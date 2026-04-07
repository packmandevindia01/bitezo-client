export interface PosCategory {
  id: string;
  name: string;
  description: string;
}

export interface PosProduct {
  id: number;
  name: string;
  categoryId: string;
  price: number;
  sku: string;
  prepTime: string;
  bestseller?: boolean;
}

export interface PosCartItem {
  productId: number;
  quantity: number;
}

export interface PosQuickAction {
  id: string;
  label: string;
}

export interface PosTenderOption {
  id: string;
  label: string;
}
