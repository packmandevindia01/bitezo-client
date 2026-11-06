/** Fields of a cart line (selectCartDetails) that decide the numbers shown for it. */
export interface CartLineDisplaySource {
  quantity?: number;
  price?: number;
  lineTotal?: number;
  originalLineTotal?: number;
  itemDiscount?: number;
  discountValue?: number;
  extras?: { price?: number; qty?: number }[];
  product?: { price?: number };
}

export interface CartLineDisplay {
  /** Unit price shown for the line, extras included. */
  unitPrice: number;
  /** Line amount before the item discount. */
  originalTotal: number;
  /** Line amount the cashier pays for this line. */
  lineTotal: number;
  itemDiscount: number;
}

/**
 * The numbers every POS screen shows for one cart line.
 *
 * `line.price` must not be shown directly: on a saved order it includes the extras until the cart is first
 * changed, and after that it is the product price alone. The line total includes extras in both cases.
 */
export const getCartLineDisplay = (line: CartLineDisplaySource): CartLineDisplay => {
  const qty = line.quantity || 1;
  const itemDiscount = Number(
    line.itemDiscount ??
    line.discountValue ??
    (line.originalLineTotal !== undefined && line.lineTotal !== undefined && line.originalLineTotal > line.lineTotal
      ? line.originalLineTotal - line.lineTotal
      : 0)
  );
  const originalTotal = line.originalLineTotal ?? ((line.lineTotal || 0) + itemDiscount);
  const productPrice = line.price || line.product?.price || 0;
  const extrasTotal = (line.extras || []).reduce((sum, ex) => sum + (Number(ex.price) || 0) * (Number(ex.qty) || 1), 0);

  const unitPrice = (line.extras?.length ?? 0) > 0
    ? (originalTotal > 0 ? originalTotal / qty : productPrice + extrasTotal / qty)
    : productPrice;

  return { unitPrice, originalTotal, lineTotal: line.lineTotal || 0, itemDiscount };
};
