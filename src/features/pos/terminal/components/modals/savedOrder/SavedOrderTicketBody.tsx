/**
 * The Recall preview's ticket (meta fields, items with extras / modifiers / messages, item discounts, delivery block,
 * totals) for one saved order. Shared by the Recall preview (PosRecallDetailsModal) and the Dine-In table cards
 * (DineInTableOrdersModal), so both always show the same details.
 */
import React, { useState, useEffect } from "react";
import { toDisplayNo } from "../../../../services/orderResponse";
import { storedOrderFooter } from "../../../../pricing";
import { fallbackOrderTypeByName } from "../../../store/posSlice";
import { formatAmount, getDecimalPart } from "../../../../../../utils/currency";
import { balanceBillFooter } from "../../../../../../utils/money";
import { isEnableVatGuestPrint } from "../../../../utils/guestPrintTemplate";
import { getVatStatus, roundCalc, getPriceView } from "../../../utils/billing";
import { formatItemDisplayName } from "../../../../utils/alternativeHelpers";
import { sortOrderDetailsBySequence } from "../../../utils/orderSort";
import { checkOrderHasBillDiscount } from "../../../utils/orderDiscountCheck";
import { t, getLocalizedName } from "../../../../utils/posLocalization";
import { resolveEmployeeNameForPrint, savedOrderWaiterName } from "../../../../utils/employeeNames";
import { MetaField, ItemDiscountRow, LineAddons, DeliveryDetailsBlock, SavedOrderTotals } from "./SavedOrderTicket";
import { dedupeModifierRows, modifierRowsOfLine, classifyLineModifiers } from "./lineModifiers";
import type { fetchRecallOrderData } from "../../../utils/loadRecallOrder";
import type { parseRecallListText } from "../../../utils/recallListText";

export interface SavedOrderTicketBodyProps {
  /** The order as fetchRecallOrderData returns it (or the Recall list fallback). */
  order: Awaited<ReturnType<typeof fetchRecallOrderData>>;
  orderId: number | null;
  orderDetailsStr?: string;
  fallbackDetails?: ReturnType<typeof parseRecallListText>;
  /** Recall: items scroll inside the ticket. Dine-In cards: the whole card scrolls, so no limit. */
  itemsMaxHeightClass?: string;
  /** Hide the "BITEZO POS / TERMINAL TICKET" heading (Dine-In cards have their own heading). */
  hideHeading?: boolean;
  className?: string;
}

export const SavedOrderTicketBody: React.FC<SavedOrderTicketBodyProps> = ({
  order,
  orderId,
  orderDetailsStr = "",
  fallbackDetails,
  itemsMaxHeightClass = "max-h-[200px]",
  hideHeading = false,
  className = "flex-1 min-w-0 p-5",
}) => {
  // Employee of the order (AGENT.md §6.0) looked up by its employee id when this device has no name for it yet.
  // Kept with the order it belongs to, so another order never shows a name looked up for the previous one.
  const [lookup, setLookup] = useState<{ order: unknown; name: string | null }>({ order: null, name: null });
  const lookedUpEmployee = lookup.order === order ? lookup.name : null;

  useEffect(() => {
    const raw = order?.masterData || order?.master || order;
    const m = Array.isArray(raw) ? (raw[0] || {}) : (raw || {});
    const empId = m.employeeId ?? m.empId ?? m.salespersonId;
    const savedName = m.employeeName ?? m.waiter ?? order?.employeeName ?? fallbackDetails?.employeeName;
    if (!order || savedOrderWaiterName(savedName, empId) !== "Waiter" || !(Number(empId) > 0)) return;
    let cancelled = false;
    resolveEmployeeNameForPrint(empId, savedName)
      .then((name) => { if (!cancelled) setLookup({ order, name }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [order, fallbackDetails]);

  // Deduplicate modifiersData to prevent Cartesian product duplicates from backend SQL joins
  const modifiersData = React.useMemo(
    () => dedupeModifierRows(order?.modifiersData || order?.modifiers || order?.ModifiersData || order?.Modifiers || order?.data?.modifiersData || order?.data?.modifiers || []),
    [order?.modifiersData, order?.modifiers, order?.ModifiersData, order?.Modifiers, order?.data]
  );

  const rawMaster = order?.masterData || order?.master || order;
  const master = Array.isArray(rawMaster) ? (rawMaster[0] || {}) : (rawMaster || {});
  const details = sortOrderDetailsBySequence(order?.detailsData || order?.details || []);
  
  const orderNo = master.orderNo ?? order?.orderNo ?? orderId ?? "";
  const ticketNo = toDisplayNo(master.ticketNo) ?? toDisplayNo(order?.ticketNo) ?? "";
  // The order's employee: punched code or default employee (AGENT.md §6.0), never this device's other names.
  const rawEmpName = master.employeeName ?? master.waiter ?? order?.employeeName ?? fallbackDetails?.employeeName;
  const shownEmployee = savedOrderWaiterName(rawEmpName, master.employeeId ?? master.empId ?? master.salespersonId);
  const employeeName = shownEmployee === "Waiter" && lookedUpEmployee ? lookedUpEmployee : shownEmployee;
  
  const orderTypeMap: Record<number, string> = {
    1: "DineIn",
    2: "TakeOut",
    3: "DriveThru",
    4: "Delivery",
    5: "Providers",
    6: "Coming"
  };
  const orderTypeCandidate =
    master.orderType ||
    orderTypeMap[master.orderTypeId] ||
    master.orderTypeName ||
    order?.orderTypeName ||
    fallbackDetails?.orderTypeName ||
    (orderDetailsStr?.match(/\((DineIn|TakeOut|DriveThru|Delivery|Providers|Coming)\)/i)?.[1]) ||
    "TakeOut";
  const orderTypeName = fallbackOrderTypeByName(orderTypeCandidate).orderType;
  
  // Extract time from orderDetailsStr as a reliable fallback (e.g. "7:46:02 PM")
  const timeFromDetails = (() => {
    if (!orderDetailsStr) return "";
    const m = orderDetailsStr.match(/(\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM))/i);
    return m ? m[1] : "";
  })();

  // Try every common backend date field name — never fall back to current time
  const voucherDate: string =
    master.voucherDate ??
    master.VoucherDate ??
    master.orderDate ??
    master.OrderDate ??
    master.entryDate ??
    master.EntryDate ??
    master.transDate ??
    master.TransDate ??
    master.punchTime ??
    master.PunchTime ??
    master.orderTime ??
    master.OrderTime ??
    master.createdAt ??
    master.CreatedAt ??
    master.orderDateTime ??
    master.OrderDateTime ??
    order?.voucherDate ??
    order?.VoucherDate ??
    order?.orderDate ??
    order?.OrderDate ??
    order?.entryDate ??
    order?.createdAt ??
    timeFromDetails; // last resort: extract from the recall list text

  // Format date as dd/MM/yyyy preserving time portion
  const formatVoucherDate = (raw: string): string => {
    try {
      if (!raw) return "";
      const d = new Date(raw);
      if (isNaN(d.getTime())) {
        // If it's just a time string like "7:46:02 PM" extracted from details, prepend today's date
        if (/am|pm/i.test(raw)) {
          const today = new Date();
          const dd = String(today.getDate()).padStart(2, '0');
          const mm = String(today.getMonth() + 1).padStart(2, '0');
          const yyyy = today.getFullYear();
          return `${dd}/${mm}/${yyyy} ${raw}`;
        }
        return raw;
      }
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
    } catch { return raw; }
  };

  // Master Totals directly from API
  const rawVatExcl = Number(
    master.vatExclAmount !== undefined && master.vatExclAmount !== null
      ? master.vatExclAmount
      : (master.VatExclAmount !== undefined && master.VatExclAmount !== null
          ? master.VatExclAmount
          : (master.subTotal ?? 0))
  );

  const displayServiceCharge = Number(master.serviceCharge ?? master.ServiceCharge ?? 0);
  const displayLevy = Number(master.levyAmt ?? master.levy ?? master.Levy ?? 0);
  const displayCharges = roundCalc(displayServiceCharge + displayLevy);

  const displayDeliveryCharge = Number(master.deliveryCharge ?? master.DeliveryCharge ?? 0);

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

  const lineDiscountsTotal = (details || []).reduce(
    (sum: number, d: any) => sum + Number(d.discAmount ?? d.DiscAmount ?? 0),
    0
  );


  // When master data has discount: treated as bill level discount (backendDiscount is already exclusive).
  // When details data only has discount: treated as item discount.
  const isBillDiscount = Boolean(
    backendDiscount > 0.001 ||
    Number(master.discPer ?? master.DiscPer ?? 0) > 0 ||
    checkOrderHasBillDiscount(order) ||
    checkOrderHasBillDiscount({ master, details })
  );
  const isItemDiscount = !isBillDiscount && lineDiscountsTotal > 0.001;

  // Discount from THE stored-order footer (exclusive, per-line saved rates) — same as recall-edit.
  const displayDiscount = storedOrderFooter(order, getPriceView()).discount;

  // Sub Total includes any discount (item or bill discount): (vatExclAmount - charges) + discount
  const displaySubTotal = roundCalc(Math.max(0, rawVatExcl - displayCharges) + displayDiscount);

  const displayVatAmount = Number(
    master.vatAmount ??
    master.VatAmount ??
    master.vatAmt ??
    0
  );
  const isVatActive = Boolean(isEnableVatGuestPrint(master as any) || getVatStatus() || displayVatAmount > 0);

  const netAmount = Number(
    master.netAmount ??
    master.NetAmount ??
    0
  );


  // Footer balanced to the fil so it always adds up (Sub Total − Discount + Charges = Net Value;
  // Net Value + VAT + Delivery = Grand Total). Display only — utils/money.ts balanceBillFooter.
  const shownFooter = balanceBillFooter({
    subTotal: displaySubTotal,
    discount: displayDiscount,
    charges: displayCharges,
    vat: displayVatAmount,
    delivery: displayDeliveryCharge,
    grandTotal: netAmount,
  }, getDecimalPart());


  const hasDelivery = !!master.mobileNo || !!master.contactNo || !!master.deliveryCustomerName;
  const deliveryDetails = hasDelivery ? {
    mobile: master.mobileNo || master.contactNo || "",
    customerName: master.deliveryCustomerName || master.customerName || "",
    callBack: master.callBack || master.callback || master.callBackNo || master.callbackNo || "",
    area: master.area || "",
    block: master.blockNo || "",
    road: master.roadNo || "",
    building: master.buildingNo || "",
    flat: master.flatNo || "",
    change: master.change || master.keepChanges || "",
  } : order?.deliveryDetails;

  return (
      <div className={`${className} bg-[#faf8f5] text-stone-900 font-mono text-xs flex flex-col justify-between select-text shadow-inner`}>
        <div>
          {/* Ticket Header */}
          {!hideHeading && <div className="text-center font-bold border-b border-dashed border-stone-400 pb-3 mb-3">
            <div className="text-sm font-black tracking-wide uppercase">BITEZO POS</div>
            <div className="text-[10px] text-stone-500 font-medium">TERMINAL TICKET</div>
          </div>}

          {/* Order Meta Info Grid */}
          <div className="grid grid-cols-2 gap-y-1 text-[11px] border-b border-dashed border-stone-400 pb-3 mb-3">
            <MetaField label="Order No">{orderNo}</MetaField>
            <MetaField label="Ticket" className="text-right">{ticketNo}</MetaField>
            <MetaField label="Emp">{employeeName}</MetaField>
            <MetaField label="Type" className="text-right" valueClassName="font-bold text-[#49293e]">{orderTypeName}</MetaField>
            <MetaField label="Customer" className="col-span-2 sm:col-span-1">
              {master.deliveryCustomerName || master.vehicleCustomerName || master.customerName || "CASH CUSTOMER"}
            </MetaField>
            {orderTypeName.toLowerCase().includes("dine") && master.tableNo && (
              <MetaField label="Table" className="col-span-2 sm:col-span-1 text-right">
                {master.sectionName ? `${master.sectionName} - ` : ""}{master.tableNo}
              </MetaField>
            )}
            {master.note && (
              <MetaField label="Note" className="col-span-2 mt-1" valueClassName="font-bold italic text-stone-600">"{master.note}"</MetaField>
            )}
            {master.vehicleNo && (
              <MetaField label="Vehicle" className="col-span-2 mt-1" valueClassName="font-bold uppercase">
                {master.vehicleNo} {master.vehicleCustomerName ? `(${master.vehicleCustomerName})` : ""}
              </MetaField>
            )}
            <div className="col-span-2 text-stone-500 text-[10px] mt-1">
              Date: {formatVoucherDate(voucherDate)}
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-4">
            <div className="grid grid-cols-[28px_minmax(0,1fr)_55px_65px] gap-2 font-bold text-stone-500 text-[10px] uppercase border-b border-stone-300 pb-1 mb-2">
              <div className="text-center">{t("Qty")}</div>
              <div>{t("Item")}</div>
              <div className="text-right">{t("Price")}</div>
              <div className="text-right">{t("Total")}</div>
            </div>

            <div className={`space-y-2.5 overflow-y-auto ${itemsMaxHeightClass} pr-1`}>
              {details.map((item: any, i: number) => {
                const primaryName = item.productName || item.itemName || `Item #${item.productId || i + 1}`;
                const arabicName = item.arabicName || item.productArabicName || "";
                const localized = getLocalizedName(primaryName, arabicName);
                const variantName = item.variantName || item.altName || "";
                const qty = Number(item.qty ?? item.quantity ?? 1);
                const price = Number(item.price ?? 0);
                const lineTotal = Number(item.amount ?? (price * qty));
                const lineDisc = Number(item.discAmount ?? 0);
                const itemDisc = (isItemDiscount && lineDisc > 0) ? lineDisc : 0;
                const netAmt = itemDisc > 0 ? Math.max(0, lineTotal - itemDisc) : lineTotal;
                const { extras, standardMods, messages } = classifyLineModifiers(modifierRowsOfLine(modifiersData, item.mapId ?? item.MapId));

                return (
                  <div key={i} className="flex flex-col">
                    <div className="grid grid-cols-[28px_minmax(0,1fr)_55px_65px] gap-2 items-start text-[11px] leading-tight">
                      <div className="font-bold text-stone-500 text-center">{qty}</div>
                      <div className="flex flex-col font-bold text-stone-800 min-w-0">
                        <span className="break-words [overflow-wrap:anywhere] [word-break:break-word]">
                          {formatItemDisplayName(localized.primary, variantName)}
                        </span>
                        {localized.secondary && (
                          <span className="text-[10px] text-stone-500 font-semibold break-words [overflow-wrap:anywhere] [word-break:break-word] mt-0.5">{localized.secondary}</span>
                        )}
                      </div>
                      <div className="text-right text-stone-500 shrink-0">{formatAmount(price)}</div>
                      <div className="text-right font-bold text-stone-900 shrink-0">
                        {formatAmount(lineTotal)}
                      </div>
                    </div>

                    {isItemDiscount && itemDisc > 0 && <ItemDiscountRow variant="recall" discount={itemDisc} net={netAmt} />}
                    <LineAddons variant="recall" extras={extras} standardMods={standardMods} messages={messages} />
                  </div>
                );
              })}
            </div>
          </div>

          {deliveryDetails && <DeliveryDetailsBlock details={deliveryDetails} />}
        </div>

        <SavedOrderTotals
          shown={shownFooter}
          discount={displayDiscount}
          charges={displayCharges}
          delivery={displayDeliveryCharge}
          showVat={isVatActive || displayVatAmount > 0}
        />
      </div>
  );
};
