/**
 * Footer figures of a Dine-In table bill (guest bill and settle receipt). Both prints carried the same copy of
 * this code; joined on 2026-11-11 (split of DineInTableOrdersModal). Values come from the print pricing
 * (`buildPrintPricing`), falling back to the stored master.
 */
import type { buildPrintPricing } from "../../utils/printPricing";
import { isBillArabicEnabled } from "../../utils/alternativeHelpers";
import { roundCalc, getPrintPrice } from "./billing";

type PrintPricing = ReturnType<typeof buildPrintPricing>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

export const dineInBillFigures = (
  unified: PrintPricing,
  master: Loose,
  isTaxInclusive: boolean,
  options: {
    /** Settle receipt: a discount line only for a bill discount (item discounts show on their lines). */
    discountOnlyForBillDiscount: boolean;
  }
) => {
  const s: Loose = unified.summary;
  const discount = options.discountOnlyForBillDiscount && !s.isBillDiscount
    ? 0
    : Number(
        isTaxInclusive
          ? (s.totalDiscountIncl ?? (typeof s.getTotalDiscount === "function" ? s.getTotalDiscount(true) : (master.discAmount ?? master.discount ?? 0)))
          : (s.totalDiscountExcl ?? (typeof s.getTotalDiscount === "function" ? s.getTotalDiscount(false) : (master.discAmount ?? master.discount ?? 0)))
      );
  const subTotal = Number(
    isTaxInclusive
      ? (s.subTotalInclusive > 0
          ? s.subTotalInclusive
          : (typeof s.getSubTotal === "function" ? s.getSubTotal(true) : (master.subTotal ?? 0)))
      : (s.subTotalExclusive > 0
          ? s.subTotalExclusive
          : (typeof s.getSubTotal === "function" ? s.getSubTotal(false) : (master.vatExclAmount !== undefined ? Number(master.vatExclAmount) + discount : (master.subTotal ?? 0))))
  );
  const vatAmount = Number(
    (s.vatAmount && s.vatAmount > 0)
      ? s.vatAmount
      : (master.vatAmount ?? master.VatAmount ?? 0)
  );
  const serviceCharge = Number(master.serviceCharge ?? s.serviceCharge ?? 0);
  const levy = Number(master.levyAmt ?? master.levy ?? master.Levy ?? s.levy ?? 0);
  const charges = roundCalc(serviceCharge + levy);
  const netValue = getPrintPrice() !== "Inclusive" ? roundCalc(Math.max(0, subTotal - discount) + charges) : undefined;
  return { subTotal, discount, serviceCharge, levy, charges, netValue, vatAmount };
};

/** Arabic on the bill: switched on in settings, or any line has an Arabic name. */
export const dineInBillArabic = (unified: PrintPricing): boolean =>
  isBillArabicEnabled() ||
  unified.lines.some((l: Loose) => Boolean(l.productArabicName || l.variantArabic || l.altArabic));
