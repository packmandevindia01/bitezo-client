/**
 * POS pricing — shared types.
 *
 * RULES (single source of truth — see engine.ts for the implementation):
 *
 *  R1  Every line carries `priceIncludesTax`, resolved ONCE from the product master tag
 *      (or the promo / alternative / manual-edit flag that replaced it).
 *        true  → unitPrice already contains VAT + levy + service charge (customer pays it).
 *        false → unitPrice is the exclusive base; charges are added on top.
 *      Price View NEVER changes the math — it only changes what is displayed.
 *
 *  R2  Extras/modifier prices are always tax-inclusive (gross) and are converted to
 *      exclusive base with the SAME factor as the line they belong to.
 *      Extras qty is per line (it is NOT multiplied by the line quantity).
 *
 *  R3  factor = (1 + sc) × (1 + levy) × (1 + vat)
 *      Service charge applies to Dine-In only (settings.serviceChargeRate is already 0 otherwise).
 *      VAT rate is per product; 0 when VAT is disabled.
 *
 *  R4  Discounts are taken off the exclusive base BEFORE charges.
 *        percentage → base × pct
 *        amount     → discountCalc = Inclusive ? typed ÷ factor : typed
 *      A discount can never exceed the line (or bill) base.
 *
 *  R5  A bill discount REPLACES all item discounts. It is converted to exclusive once,
 *      then allocated across lines proportionally to each line's base (remainder on the
 *      largest line so the allocation sums exactly).
 *
 *  R6  Charges cascade on the discounted base:
 *        sc   = net × scRate
 *        levy = (net + sc) × levyRate
 *        vat  = (net + sc + levy) × vatRate
 *        lineNet = net + sc + levy + vat
 *
 *  R7  Delivery charge is added to the grand total after VAT and is not taxed.
 *
 *  R8  Amounts keep CALC_PRECISION (7) decimals for storage; only display/print rounds
 *      to the currency decimals. Totals are sums of the (7-dp) line values.
 *
 *  R9  The backend stores exclusive values only (price, discAmount, serviceCharge, levy,
 *      vatAmount, netAmount, vatExclAmount).
 */

export type TaxMode = "Inclusive" | "Exclusive";

export interface DiscountInput {
  type: "percentage" | "amount";
  value: number;
}

export interface PricingSettings {
  vatEnabled: boolean;
  /** percent, e.g. 10 — used only when a product has no own VAT rate */
  defaultVatRate: number;
  /** percent; already 0 for order types that do not get service charge */
  serviceChargeRate: number;
  /** percent */
  levyRate: number;
  /** how a typed fixed discount is interpreted */
  discountCalc: TaxMode;
  /** display only — never used by the engine math */
  priceView: TaxMode;
}

export interface PricingLineInput {
  qty: number;
  /** price as entered (catalog / promo / manually edited) */
  unitPrice: number;
  priceIncludesTax: boolean;
  /** percent; ignored when VAT is disabled */
  vatRate: number;
  /** each extra's gross price × extra qty, for the whole line */
  extras?: { price: number; qty: number }[];
  discount?: DiscountInput | null;
}

export interface PricedExtra {
  grossPrice: number;
  qty: number;
  /** exclusive unit price that the backend stores in modifiers.price */
  basePrice: number;
  baseAmount: number;
}

export interface PricedLine {
  qty: number;
  unitPrice: number;
  priceIncludesTax: boolean;
  /** effective VAT percent (0 if VAT disabled) */
  vatRate: number;
  factor: number;

  /** exclusive unit price of the product only (no extras) */
  baseUnitPrice: number;
  /** qty × baseUnitPrice */
  productBase: number;
  extras: PricedExtra[];
  extrasGross: number;
  extrasBase: number;
  /** productBase + extrasBase — exclusive line amount before discount */
  amount: number;
  /** amount × factor — inclusive line amount before discount */
  grossAmount: number;

  /** exclusive discount on this line (item OR allocated bill discount) */
  discountBase: number;
  /** inclusive equivalent of discountBase */
  discountGross: number;
  isBillDiscount: boolean;

  /** amount − discountBase */
  netValue: number;
  serviceCharge: number;
  levy: number;
  /** netValue + serviceCharge + levy */
  vatBase: number;
  vatAmount: number;
  /** vatBase + vatAmount — what the customer pays for this line */
  lineNet: number;
}

export interface PricedBillTotals {
  /** Σ amount (exclusive, before discount) */
  subTotalExclusive: number;
  /** Σ grossAmount (inclusive, before discount) */
  subTotalInclusive: number;
  itemDiscountExclusive: number;
  itemDiscountInclusive: number;
  billDiscountExclusive: number;
  billDiscountInclusive: number;
  discountExclusive: number;
  discountInclusive: number;
  serviceCharge: number;
  levy: number;
  /** Σ vatBase — backend `vatExclAmount` */
  vatExclAmount: number;
  vatAmount: number;
  /** Σ lineNet */
  linesNet: number;
  deliveryCharge: number;
  /** linesNet + deliveryCharge — backend `netAmount` */
  grandTotal: number;
  itemCount: number;
  extrasGross: number;
}

export interface PricedBill {
  lines: PricedLine[];
  billDiscountApplied: boolean;
  totals: PricedBillTotals;
}

export interface BillInput {
  lines: PricingLineInput[];
  billDiscount?: DiscountInput | null;
  deliveryCharge?: number;
}
