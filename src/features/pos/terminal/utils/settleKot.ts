import { isKotPrintSettleEnabled } from "../../utils/settlePrintConfig";
import { buildReorderItems } from "./reorderItems";
import type { PosCartItem } from "../../types";

interface SettleKotParams {
  cartDetails: PosCartItem[];
  /** A saved order is being settled: the kitchen already has its saved lines. */
  isEdit: boolean;
  printData?: Record<string, unknown>;
  sectionId?: number;
}

/**
 * POS config "KOT Print (Settle)". Settling sends the kitchen only what it has not received: the whole cart on a new
 * order, the added quantities on a saved one. This setting prints even with "Standard KOT Print" off.
 */
export const printKotOnSettle = async ({ cartDetails, isEdit, printData, sectionId }: SettleKotParams): Promise<void> => {
  if (!isKotPrintSettleEnabled()) return;
  const items = buildReorderItems(cartDetails);
  if (items.length === 0) return;

  const [{ printerSettingsApi }, { printHtmlReceipt }, { generateKotHtml }, { executeKotRouting }, helpers] = await Promise.all([
    import("../../services/printerSettingsApi"),
    import("../../services/qzService"),
    import("../../utils/kotTemplate"),
    import("../../utils/printerRouting"),
    import("../../utils/alternativeHelpers"),
  ]);

  await executeKotRouting(
    items,
    {
      ...printData,
      headerTitle: isEdit ? "RE-ORDER" : "KOT",
      forcedPrint: true,
      kotArabic: helpers.isKotArabicEnabled(),
      kotHeader: localStorage.getItem("kotHeader") || undefined,
      companyNameKot: helpers.isCompanyNameKotEnabled(),
    },
    sectionId,
    printerSettingsApi,
    printHtmlReceipt,
    generateKotHtml,
    isEdit,
  );
};
