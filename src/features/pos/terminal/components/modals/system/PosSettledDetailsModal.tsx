import React, { useState, useEffect } from "react";
import { buildPrintPricing } from "../../../../utils/printPricing";
import { storedOrderFooter } from "../../../../pricing";
import { Button } from "../../../../../../components/common";
import { Printer, X, Pencil } from "lucide-react";
import { useToast } from "../../../../../../app/providers/useToast";
import { formatAmount, getDecimalPart } from "../../../../../../utils/currency";
import { balanceBillFooter } from "../../../../../../utils/money";
import { isEnableVatGuestPrint } from "../../../../utils/guestPrintTemplate";
import { getPriceView, getVatStatus, roundCalc } from "../../../utils/billing";
import { formatItemDisplayName } from "../../../../utils/alternativeHelpers";
import { useAppDispatch, useAppSelector } from "../../../../../../app/hooks";
import { usePosProducts } from "../../../hooks/usePosProducts";
import { loadSettledOrderIntoCart } from "../../../utils/loadSettledOrderIntoCart";
import { t, getLocalizedName } from "../../../../utils/posLocalization";
import { checkOrderHasBillDiscount } from "../../../utils/orderDiscountCheck";
import { printSettledOrderReceipt } from "../../../utils/printSettledOrder";
import { loadSettledOrderDetails } from "../../../utils/loadSettledOrder";
import { SavedOrderWindow, SavedOrderActions, TicketActionButton, MetaField, ItemDiscountRow, LineAddons, SavedOrderTotals } from "../savedOrder/SavedOrderTicket";
import { dedupeModifierRows, modifierRowsOfLine, classifyLineModifiers } from "../savedOrder/lineModifiers";

interface PosSettledDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number | null;
  orderDetailsStr?: string;
  orderSummary?: any;
  onEditSuccess?: () => void;
}

// Waiter name for prints: utils/employeeNames.ts resolveEmployeeNameForPrint (shared with table orders).

const formatVoucherDate = (raw?: string | null): string => {
  try {
    if (!raw) return "";
    const d = new Date(raw);
    if (isNaN(d.getTime())) {
      if (/am|pm/i.test(raw)) {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, "0");
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const yyyy = today.getFullYear();
        return `${dd}/${mm}/${yyyy} ${raw}`;
      }
      return raw;
    }
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
  } catch {
    return raw || "";
  }
};


export const PosSettledDetailsModal: React.FC<PosSettledDetailsModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderDetailsStr = "",
  orderSummary,
  onEditSuccess,
}) => {
  const { showToast } = useToast();
  const dispatch = useAppDispatch();
  const productCache = useAppSelector((state) => state.pos.productCache);
  const { products } = usePosProducts();
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [resolvedEmployeeName, setResolvedEmployeeName] = useState<string>("Waiter");
  const [allExtras, setAllExtras] = useState<any[]>([]);
  const [modifierTypes, setModifierTypes] = useState<any[]>([]);

  const loadOrderDetails = () => loadSettledOrderDetails({ orderId, orderSummary, orderDetailsStr, setLoading, setOrder, setResolvedEmployeeName, setAllExtras, setModifierTypes });

  useEffect(() => {
    if (isOpen && orderId) {
      // The loader also loads the extras and modifier types (it used to be fetched twice).
      void loadOrderDetails();
    }
  }, [isOpen, orderId]);

  const handlePrint = () => printSettledOrderReceipt({ orderId, order, orderDetailsStr, orderSummary, allExtras, modifierTypes, products, productCache, resolvedEmployeeName, showToast, displayDiscount, displaySubTotal, displayCharges, displayNetValue, netAmount });

  const isCancelled = Boolean(
    order?.isCancelled === true ||
    order?.isCancelled === "true" ||
    order?.isCancelled === 1 ||
    order?.masterData?.isCancelled === true ||
    order?.masterData?.isCancelled === "true" ||
    order?.masterData?.isCancelled === 1 ||
    orderSummary?.isCancelled === true ||
    orderSummary?.isCancelled === "true" ||
    orderSummary?.isCancelled === 1 ||
    String(order?.action || "").toLowerCase() === "cancelled" ||
    String(orderSummary?.action || "").toLowerCase() === "cancelled" ||
    String(order?.status || "").toLowerCase() === "cancelled" ||
    String(orderSummary?.status || "").toLowerCase() === "cancelled"
  );

  const handleEdit = () => {
    if (!orderId || !order) return;
    loadSettledOrderIntoCart({
      orderId,
      orderData: order,
      dispatch,
      products,
      productCache,
      showToast,
      onEditSuccess: () => {
        onClose();
        onEditSuccess?.();
      },
    });
  };

  if (!isOpen) return null;

  const rawMaster = order?.masterData || order?.master || order;
  const master = Array.isArray(rawMaster) ? (rawMaster[0] || {}) : (rawMaster || {});
  const details = Array.isArray(order?.detailsData) ? order.detailsData : (Array.isArray(order?.details) ? order.details : []);
  // The backend can repeat a modifier row (SQL join); show each once, as the Recall details window does.
  const modifiersData = dedupeModifierRows(Array.isArray(order?.modifiersData) ? order.modifiersData : (Array.isArray(order?.modifiers) ? order.modifiers : []));

  const orderNo = master.orderNo ?? order?.orderNo ?? orderId ?? "";
  const orderTypeMap: Record<number, string> = {
    1: "DineIn",
    2: "TakeOut",
    3: "DriveThru",
    4: "Delivery",
    5: "Providers",
    6: "Coming",
  };
  const orderTypeName =
    master.orderType ||
    orderTypeMap[master.orderTypeId] ||
    master.orderTypeName ||
    order?.orderTypeName ||
    "DineIn";
  const netAmount = master.netAmount ?? order?.netAmount ?? 0;

  const displayCustomerName =
    master.deliveryCustomerName ||
    master.vehicleCustomerName ||
    master.customerName ||
    master.customer ||
    "CASH CUSTOMER";

  const rawDateStr =
    master.voucherDate ??
    master.orderDate ??
    master.transDate ??
    master.createdAt ??
    master.entryDate ??
    order?.voucherDate ??
    order?.orderDate ??
    order?.transDate ??
    order?.createdAt;

  const displayDateStr = formatVoucherDate(rawDateStr);
  const effectivePriceView = getPriceView();
  const isTaxInclusive = effectivePriceView === "Inclusive";

  const isBillLevelDiscount = order ? checkOrderHasBillDiscount(order) : false;
  const unified = order ? buildPrintPricing(order, { dataView: effectivePriceView, printPrice: effectivePriceView, orderType: orderTypeName, allExtras, modifierTypes, products, productCache, isBillDiscount: isBillLevelDiscount }) : null;
  const isVatActive = Boolean(isEnableVatGuestPrint(master as any) || getVatStatus() || unified?.summary?.isVatActive);

  const rawVatExcl = Number(
    master.vatExclAmount !== undefined && master.vatExclAmount !== null
      ? master.vatExclAmount
      : (master.VatExclAmount !== undefined && master.VatExclAmount !== null
          ? master.VatExclAmount
          : (master.subTotal ?? (unified ? unified.summary.subTotalExclusive : 0)))
  );

  const backendDiscount = Number(
    master.discAmount ??
    master.DiscAmount ??
    master.discAmt ??
    master.DiscAmt ??
    master.discount ??
    master.Discount ??
    master.billDiscount ??
    master.BillDiscount ??
    master.billDiscountValue ??
    0
  );
  const displayDeliveryCharge = Number(
    master.deliveryCharge ??
    master.DeliveryCharge ??
    (unified ? unified.summary.deliveryCharge : 0)
  );
  // THE stored-order footer — identical numbers on the settled screen, settled-edit and recall.
  const settledFooter = storedOrderFooter(order || {}, effectivePriceView);
  const displayCharges = settledFooter.charges;

  const lineDiscountsTotal = (details || []).reduce(
    (sum: number, d: any) => sum + Number(d.discAmount ?? d.DiscAmount ?? 0),
    0
  );

  const isBillDiscount = Boolean(
    isBillLevelDiscount ||
    backendDiscount > 0.001 ||
    Number(master.discPer ?? master.DiscPer ?? 0) > 0 ||
    unified?.summary?.isBillDiscount ||
    checkOrderHasBillDiscount(order) ||
    checkOrderHasBillDiscount({ master, details })
  );
  const isItemDiscount = !isBillDiscount && lineDiscountsTotal > 0.001;

  const displayDiscount = settledFooter.discount;

  // Sub Total includes any discount (item or bill discount): (vatExclAmount - charges) + discount
  const displaySubTotal = roundCalc(
    rawVatExcl > 0
      ? settledFooter.subTotal
      : (unified ? unified.summary.subTotalExclusive : 0)
  );

  // Stored VAT only — never invented (zero-rated orders have VAT 0).
  const displayVatAmount = Number(
    master.vatAmount ??
    master.VatAmount ??
    master.vatAmt ??
    (unified && unified.summary.vatAmount > 0 ? unified.summary.vatAmount : 0)
  );

  const displayGrandTotal = Number(
    master.netAmount ??
    master.NetAmount ??
    order?.netAmount ??
    order?.NetAmount ??
    (unified && unified.summary.grandTotal > 0 ? unified.summary.grandTotal : netAmount)
  );

  // Net Value is the tax exclusive amount directly from the API (vatExclAmount)
  const displayNetValue = roundCalc(
    rawVatExcl > 0 ? rawVatExcl : (Math.max(0, displaySubTotal - displayDiscount) + displayCharges)
  );

  // Footer balanced to the fil so it always adds up (Sub Total − Discount + Charges = Net Value;
  // Net Value + VAT + Delivery = Grand Total). Display only — utils/money.ts balanceBillFooter.
  const shownFooter = balanceBillFooter({
    subTotal: displaySubTotal,
    discount: displayDiscount,
    charges: displayCharges,
    vat: displayVatAmount,
    delivery: displayDeliveryCharge,
    grandTotal: displayGrandTotal,
  }, getDecimalPart());


  return (
    <SavedOrderWindow
      isOpen={isOpen}
      onClose={onClose}
      loading={loading}
      loadingText="Retrieving Data..."
      hasOrder={Boolean(order)}
      header={
        <>
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#f48120]">{t("ORDER DETAILS")}</h2>
            {isCancelled && (
              <span className="px-2.5 py-0.5 rounded-full bg-red-600/30 text-red-400 border border-red-500/50 text-[10px] font-black uppercase tracking-wider">
                {t("CANCELLED")}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-stone-800 rounded-full transition-colors text-stone-400">
            <X size={18} />
          </button>
        </>
      }
    >
      <div className="flex-1 min-w-0 p-5 bg-[#faf8f5] text-stone-900 font-mono text-xs overflow-y-auto">
        <div className="text-center font-bold border-b border-dashed border-stone-400 pb-3 mb-3">
          <div className="text-sm font-black uppercase tracking-wide">BITEZO POS</div>
          <div className="text-[10px] text-stone-500 font-medium">{t("SETTLED ORDER TICKET")}</div>
          {isCancelled && (
            <div className="mt-2 inline-block px-3 py-0.5 rounded-full bg-red-100 text-red-700 font-black text-xs uppercase tracking-widest border border-red-300">
              *** {t("CANCELLED")} ***
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-y-1 text-[11px] border-b border-dashed border-stone-400 pb-3 mb-3">
          {(master.voucherNo || master.invoiceNo || master.voucherNumber || master.saleNo) && (
            <MetaField label={t("Invoice")}>
              {master.voucherNo || master.invoiceNo || master.voucherNumber || master.saleNo}
            </MetaField>
          )}
          <MetaField label={t("Order No")}>{orderNo}</MetaField>
          <MetaField label={t("Emp")}>{resolvedEmployeeName}</MetaField>
          <MetaField label={t("Type")} className="text-right" valueClassName="font-bold text-[#49293e]">{t(orderTypeName)}</MetaField>
          <MetaField label={t("Customer")} className="col-span-2 sm:col-span-1">{displayCustomerName}</MetaField>
          {orderTypeName.toLowerCase().includes("dine") && master.tableNo && (
            <MetaField label={t("Table")} className="col-span-2 sm:col-span-1 text-right">
              {master.sectionName ? `${master.sectionName} - ` : ""}
              {master.tableNo}
            </MetaField>
          )}
          {master.note && (
            <MetaField label={t("Note")} className="col-span-2 mt-1" valueClassName="font-bold italic text-stone-600">"{master.note}"</MetaField>
          )}
          {master.vehicleNo && (
            <MetaField label={t("Vehicle")} className="col-span-2 mt-1" valueClassName="font-bold uppercase">
              {master.vehicleNo} {master.vehicleCustomerName ? `(${master.vehicleCustomerName})` : ""}
            </MetaField>
          )}
          {displayDateStr && (
            <div className="col-span-2 text-stone-500 text-[10px] mt-1">
              Date: {displayDateStr}
            </div>
          )}
        </div>
        <div className="grid grid-cols-[28px_minmax(0,1fr)_55px_65px] gap-2 border-b border-dashed border-stone-400 pb-2 mb-2 text-[10px] font-bold text-stone-500 uppercase">
          <div className="text-center">{t("Qty")}</div>
          <div>{t("Item")}</div>
          <div className="text-right">{t("Price")}</div>
          <div className="text-right">{t("Total")}</div>
        </div>
        <div className="space-y-2.5">
          {(details && details.length > 0 ? details : (unified?.lines || [])).map((rawItem: any, i: number) => {
            const isUnifiedLine = rawItem?.isUnifiedPricingLine === true;
            const primaryName = isUnifiedLine ? rawItem.productName : (rawItem.productName || rawItem.itemName || `Item #${rawItem.productId || i + 1}`);
            const arabicName = isUnifiedLine ? rawItem.productArabicName : (rawItem.arabicName || rawItem.productArabicName || "");
            const localized = getLocalizedName(primaryName, arabicName);
            const variantName = isUnifiedLine ? rawItem.variantName : (rawItem.variantName || rawItem.altName || "");
            const displayItemName = formatItemDisplayName(localized.primary, variantName);
            const displaySecondaryName = localized.secondary
              ? formatItemDisplayName(localized.secondary, isUnifiedLine ? (rawItem.variantArabic || variantName) : (rawItem.variantArabic || rawItem.altArabic || variantName))
              : "";

            const qty = Number(rawItem.quantity ?? rawItem.qty ?? 1);
            const price = isUnifiedLine ? rawItem.getRate(isTaxInclusive) : Number(rawItem.price ?? 0);
            const lineDisc = isUnifiedLine
              ? (typeof rawItem.getDiscount === "function" ? rawItem.getDiscount(isTaxInclusive) : (rawItem.lineDiscount || 0))
              : Number(rawItem.discAmount ?? 0);
            const itemDisc = (isItemDiscount && lineDisc > 0) ? lineDisc : 0;
            const origGrossAmt = isUnifiedLine
              ? (isTaxInclusive ? rawItem.inclusiveGross : rawItem.exclusiveGross)
              : Number(rawItem.amount ?? (price * qty));
            const netAmt = itemDisc > 0
              ? Math.max(0, origGrossAmt - itemDisc)
              : (isUnifiedLine
                  ? ((unified?.summary?.isBillDiscount || isBillLevelDiscount) ? origGrossAmt : (isTaxInclusive ? rawItem.inclusiveAmount : rawItem.exclusiveAmount))
                  : origGrossAmt);

            // Modifiers / extras of the line (unified pricing lines carry them already split)
            const lineRows = isUnifiedLine ? [] : modifierRowsOfLine(modifiersData, rawItem.mapId ?? rawItem.MapId);
            const split = classifyLineModifiers(lineRows);
            const extras = isUnifiedLine ? (rawItem.extras || []) : split.extras;
            const standardMods = isUnifiedLine ? (rawItem.modifiers || []) : split.standardMods;
            const messages = isUnifiedLine ? (rawItem.messages || []) : split.messages;

            return (
              <div key={i} className="space-y-0.5">
                <div className="grid grid-cols-[28px_minmax(0,1fr)_55px_65px] gap-2 text-[11px] items-start">
                  <div className="font-bold text-stone-500 text-center">{qty}</div>
                  <div className="min-w-0">
                    <div className="font-bold text-stone-800 break-words [overflow-wrap:anywhere] [word-break:break-word]">{displayItemName}</div>
                    {displaySecondaryName && (
                      <div className="text-[9px] text-stone-500 font-medium break-words [overflow-wrap:anywhere] [word-break:break-word] mt-0.5">{displaySecondaryName}</div>
                    )}
                  </div>
                  <div className="text-right text-stone-500 shrink-0">{formatAmount(price)}</div>
                  <div className="text-right font-bold text-stone-900 shrink-0">{formatAmount(origGrossAmt)}</div>
                </div>
                {isItemDiscount && itemDisc > 0 && <ItemDiscountRow variant="settled" discount={itemDisc} net={netAmt} />}
                <LineAddons variant="settled" extras={extras} standardMods={standardMods} messages={messages} />
              </div>
            );
          })}
        </div>
        <SavedOrderTotals
          shown={shownFooter}
          discount={displayDiscount}
          charges={displayCharges}
          delivery={displayDeliveryCharge}
          showVat={isVatActive || displayVatAmount > 0}
        />
      </div>

      <SavedOrderActions>
        <Button
          variant="primary"
          onClick={handlePrint}
          disabled={loading || !order}
          className="flex-1 md:flex-initial h-12 md:h-14 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-stone-100 font-black text-[10px] uppercase tracking-widest transition-all flex flex-col justify-center items-center gap-1 shadow-md disabled:opacity-50"
        >
          <Printer size={18} strokeWidth={2.5} />
          {t("PRINT")}
        </Button>

        <TicketActionButton tone="edit" onClick={handleEdit} disabled={loading || !order} dimWhenDisabled title={t("EDIT")}>
          <Pencil size={18} strokeWidth={2.5} />
          {t("EDIT")}
        </TicketActionButton>

        <TicketActionButton tone="close" onClick={onClose}>
          <X size={18} strokeWidth={2.5} />
          {t("CLOSE")}
        </TicketActionButton>
      </SavedOrderActions>
    </SavedOrderWindow>
  );
};