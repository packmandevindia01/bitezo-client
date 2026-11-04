import React from "react";
import { modifierLabelOf } from "../../../../utils/modifierLabel";
import { formatAmount } from "../../../../../../utils/currency";
import { getLocalizedName, t } from "../../../../utils/posLocalization";
import { formatItemDisplayName } from "../../../../utils/alternativeHelpers";

export interface PosReceiptTicketProps {
  orderNo?: number | string;
  ticketNo?: number | string;
  invoiceNo?: number | string;
  employeeName?: string;
  orderTypeName?: string;
  customerName?: string;
  tableNo?: string;
  sectionName?: string;
  note?: string;
  vehicleNo?: string;
  vehicleCustomerName?: string;
  voucherDate?: string | Date;
  isCancelled?: boolean;
  subTitle?: string;

  details: any[];
  modifiersData?: any[];

  summary: {
    subtotal: number;
    discount?: number;
    isItemDiscount?: boolean;
    charges?: number;
    vat?: number;
    grandTotal: number;
    deliveryCharge?: number;
    netValue?: number;
  };

  deliveryDetails?: {
    mobile?: string;
    callBack?: string;
    customerName?: string;
    flat?: string;
    building?: string;
    block?: string;
    road?: string;
    area?: string;
    change?: string;
  } | null;

  customHeader?: React.ReactNode;
  customFooter?: React.ReactNode;
}

export const PosReceiptTicket: React.FC<PosReceiptTicketProps> = ({
  orderNo,
  ticketNo,
  invoiceNo,
  employeeName = "Waiter",
  orderTypeName = "TakeOut",
  customerName = "CASH CUSTOMER",
  tableNo,
  sectionName,
  note,
  vehicleNo,
  vehicleCustomerName,
  voucherDate,
  isCancelled = false,
  subTitle = "TERMINAL TICKET",
  details = [],
  modifiersData = [],
  summary,
  deliveryDetails,
  customHeader,
  customFooter,
}) => {
  const formatDisplayDate = (d?: string | Date) => {
    if (!d) return "";
    try {
      const date = typeof d === "string" ? new Date(d) : d;
      return !isNaN(date.getTime())
        ? date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        : String(d);
    } catch {
      return String(d);
    }
  };

  const isDineIn = (orderTypeName || "").toLowerCase().includes("dine");
  const isItemDiscount = Boolean(summary.isItemDiscount);
  const displayDiscount = Number(summary.discount || 0);

  return (
    <div className="flex-1 min-w-0 p-5 bg-[#faf8f5] text-stone-900 font-mono text-xs overflow-y-auto">
      {/* Receipt Header */}
      <div className="text-center font-bold border-b border-dashed border-stone-400 pb-3 mb-3">
        <div className="text-sm font-black uppercase tracking-wide">BITEZO POS</div>
        <div className="text-[10px] text-stone-500 font-medium">{t(subTitle)}</div>
        {isCancelled && (
          <div className="mt-2 inline-block px-3 py-0.5 rounded-full bg-red-100 text-red-700 font-black text-xs uppercase tracking-widest border border-red-300">
            *** {t("CANCELLED")} ***
          </div>
        )}
        {customHeader}
      </div>

      {/* Order Meta Info Grid */}
      <div className="grid grid-cols-2 gap-y-1 text-[11px] border-b border-dashed border-stone-400 pb-3 mb-3">
        {invoiceNo && (
          <div className="min-w-0 break-words [overflow-wrap:anywhere]">
            <span className="text-stone-500">{t("Invoice")}: </span>
            <span className="font-bold">{invoiceNo}</span>
          </div>
        )}
        {orderNo !== undefined && (
          <div className="min-w-0 break-words [overflow-wrap:anywhere]">
            <span className="text-stone-500">{t("Order No")}: </span>
            <span className="font-bold">{orderNo}</span>
          </div>
        )}
        {ticketNo !== undefined && (
          <div className="text-right min-w-0 break-words [overflow-wrap:anywhere]">
            <span className="text-stone-500">{t("Ticket")}: </span>
            <span className="font-bold">{ticketNo}</span>
          </div>
        )}
        <div className="min-w-0 break-words [overflow-wrap:anywhere]">
          <span className="text-stone-500">{t("Emp")}: </span>
          <span className="font-bold">{employeeName}</span>
        </div>
        <div className="text-right min-w-0 break-words [overflow-wrap:anywhere]">
          <span className="text-stone-500">{t("Type")}: </span>
          <span className="font-bold text-[#49293e]">{t(orderTypeName)}</span>
        </div>
        <div className="col-span-2 sm:col-span-1 min-w-0 break-words [overflow-wrap:anywhere]">
          <span className="text-stone-500">{t("Customer")}: </span>
          <span className="font-bold">{customerName}</span>
        </div>
        {isDineIn && tableNo && (
          <div className="col-span-2 sm:col-span-1 text-right min-w-0 break-words [overflow-wrap:anywhere]">
            <span className="text-stone-500">{t("Table")}: </span>
            <span className="font-bold">
              {sectionName ? `${sectionName} - ` : ""}
              {tableNo}
            </span>
          </div>
        )}
        {note && (
          <div className="col-span-2 mt-1 min-w-0 break-words [overflow-wrap:anywhere]">
            <span className="text-stone-500">{t("Note")}: </span>
            <span className="font-bold italic text-stone-600">"{note}"</span>
          </div>
        )}
        {vehicleNo && (
          <div className="col-span-2 mt-1 min-w-0 break-words [overflow-wrap:anywhere]">
            <span className="text-stone-500">{t("Vehicle")}: </span>
            <span className="font-bold uppercase">
              {vehicleNo} {vehicleCustomerName ? `(${vehicleCustomerName})` : ""}
            </span>
          </div>
        )}
        {voucherDate && (
          <div className="col-span-2 text-stone-500 text-[10px] mt-1">
            {t("Date")}: {formatDisplayDate(voucherDate)}
          </div>
        )}
      </div>

      {/* Items Table Header */}
      <div className="grid grid-cols-[28px_minmax(0,1fr)_55px_65px] gap-2 border-b border-dashed border-stone-400 pb-2 mb-2 text-[10px] font-bold text-stone-500 uppercase">
        <div className="text-center">{t("Qty")}</div>
        <div>{t("Item")}</div>
        <div className="text-right">{t("Price")}</div>
        <div className="text-right">{t("Total")}</div>
      </div>

      {/* Items Table Body */}
      <div className="space-y-2.5 overflow-y-auto max-h-[220px] pr-1">
        {details.map((item: any, i: number) => {
          const primaryName = item.productName || item.itemName || `Item #${item.productId || i + 1}`;
          const arabicName = item.arabicName || item.productArabicName || "";
          const localized = getLocalizedName(primaryName, arabicName);
          const variantName = item.variantName || item.altName || "";
          const displayItemName = formatItemDisplayName(localized.primary, variantName);
          const displaySecondaryName = localized.secondary
            ? formatItemDisplayName(localized.secondary, item.variantArabic || item.altArabic || variantName)
            : "";

          const qty = Number(item.qty ?? item.quantity ?? 1);
          const price = Number(item.price ?? 0);
          const lineTotal = Number(item.amount ?? (price * qty));
          const lineDisc = Number(item.discAmount ?? 0);
          const itemDisc = (isItemDiscount && lineDisc > 0) ? lineDisc : 0;
          const netAmt = itemDisc > 0 ? Math.max(0, lineTotal - itemDisc) : lineTotal;

          const itemMapId = item.mapId ?? item.MapId;
          const itemMods = itemMapId !== undefined
            ? modifiersData.filter((m: any) => Number(m.mapId ?? m.MapId) === Number(itemMapId))
            : [];

          const extras = itemMods.filter((m: any) => {
            const p = Number(m.price ?? 0);
            const s = String(m.status || "").toLowerCase();
            const tid = Number(m.typeId || 0);
            return s === "extras" || s === "extra" || tid === 2 || p > 0;
          });

          const standardMods = itemMods.filter((m: any) => {
            const p = Number(m.price ?? 0);
            const s = String(m.status || "").toLowerCase();
            const tid = Number(m.typeId || 0);
            return s !== "message" && s !== "extras" && s !== "extra" && tid !== 2 && p <= 0;
          });

          const messages = itemMods.filter((m: any) => {
            const s = String(m.status || "").toLowerCase();
            return s === "message" || s === "messages";
          });

          return (
            <div key={i} className="flex flex-col">
              <div className="grid grid-cols-[28px_minmax(0,1fr)_55px_65px] gap-2 items-start text-[11px] leading-tight">
                <div className="font-bold text-stone-500 text-center">{qty}</div>
                <div className="flex flex-col font-bold text-stone-800 min-w-0">
                  <span className="break-words [overflow-wrap:anywhere] [word-break:break-word]">
                    {displayItemName}
                  </span>
                  {displaySecondaryName && (
                    <span className="text-[10px] text-stone-500 font-semibold break-words [overflow-wrap:anywhere] [word-break:break-word] mt-0.5">
                      {displaySecondaryName}
                    </span>
                  )}
                </div>
                <div className="text-right text-stone-500 shrink-0">{formatAmount(price)}</div>
                <div className="text-right font-bold text-stone-900 shrink-0">
                  {formatAmount(lineTotal)}
                </div>
              </div>

              {/* Only show line item discount if this is an Item-Level discount */}
              {isItemDiscount && itemDisc > 0 && (
                <div className="grid grid-cols-[28px_minmax(0,1fr)_55px_65px] gap-2 items-start text-[11px] leading-tight mt-0.5 font-bold">
                  <div></div>
                  <div className="col-span-2 text-right text-stone-700 whitespace-nowrap">
                    {t("Disc")} : {formatAmount(itemDisc)}
                  </div>
                  <div className="text-right text-stone-900 shrink-0">
                    {formatAmount(netAmt)}
                  </div>
                </div>
              )}

              {/* Extras */}
              {extras.length > 0 && extras.map((ex: any, exIdx: number) => {
                const exName = ex.modifierName || ex.name || "Extra";
                const exQty = Number(ex.qty ?? 1);
                return (
                  <div key={`ex-${exIdx}`} className="grid grid-cols-[28px_minmax(0,1fr)_55px_65px] gap-2 text-[9px] text-[#f48120] font-medium pl-6 italic items-start mt-0.5">
                    <div className="col-span-3 min-w-0 break-words [overflow-wrap:anywhere] [word-break:break-word]">
                      + {exQty > 1 ? `${exQty} x ` : ""}{exName}
                    </div>
                    <div className="text-right shrink-0"></div>
                  </div>
                );
              })}

              {/* Modifiers */}
              {standardMods.length > 0 && standardMods.map((mod: any, mIdx: number) => {
                return (
                  <div key={`mod-${mIdx}`} className="grid grid-cols-[28px_minmax(0,1fr)_55px_65px] gap-2 text-[9px] text-[#f48120] font-medium pl-6 italic items-start mt-0.5">
                    <div className="col-span-3 min-w-0 break-words [overflow-wrap:anywhere] [word-break:break-word]">
                      * {modifierLabelOf(mod)}
                    </div>
                    <div className="text-right shrink-0"></div>
                  </div>
                );
              })}

              {/* Messages */}
              {messages.length > 0 && messages.map((msg: any, msgIdx: number) => {
                const msgName = msg.modifierName || msg.name || "";
                return (
                  <div key={`msg-${msgIdx}`} className="grid grid-cols-[28px_minmax(0,1fr)_55px_65px] gap-2 text-[9px] text-purple-600 font-medium pl-6 italic items-start mt-0.5">
                    <div className="col-span-3 min-w-0 break-words [overflow-wrap:anywhere] [word-break:break-word]">
                      💬 {msgName}
                    </div>
                    <div className="text-right shrink-0"></div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Delivery Details Block */}
      {deliveryDetails && (
        <div className="border-t border-dashed border-stone-400 pt-3 mt-3 text-[10px] space-y-0.5 text-stone-600 min-w-0">
          <div className="font-bold uppercase tracking-wider text-stone-400 mb-1">{t("Delivery Details")}</div>
          {deliveryDetails.mobile && <div className="break-words [overflow-wrap:anywhere]"><span className="font-bold text-stone-500">{t("Mobile")}: </span>{deliveryDetails.mobile}</div>}
          {deliveryDetails.callBack && <div className="break-words [overflow-wrap:anywhere]"><span className="font-bold text-stone-500">Call Back: </span>{deliveryDetails.callBack}</div>}
          {deliveryDetails.customerName && <div className="break-words [overflow-wrap:anywhere]"><span className="font-bold text-stone-500">{t("Customer")}: </span>{deliveryDetails.customerName}</div>}
          {deliveryDetails.flat && <div className="break-words [overflow-wrap:anywhere]"><span className="font-bold text-stone-500">{t("Flat No")}: </span>{deliveryDetails.flat}</div>}
          {deliveryDetails.building && <div className="break-words [overflow-wrap:anywhere]"><span className="font-bold text-stone-500">{t("Building")}: </span>{deliveryDetails.building}</div>}
          {deliveryDetails.block && <div className="break-words [overflow-wrap:anywhere]"><span className="font-bold text-stone-500">{t("Block")}: </span>{deliveryDetails.block}</div>}
          {deliveryDetails.road && <div className="break-words [overflow-wrap:anywhere]"><span className="font-bold text-stone-500">{t("Road")}: </span>{deliveryDetails.road}</div>}
          {deliveryDetails.area && <div className="break-words [overflow-wrap:anywhere]"><span className="font-bold text-stone-500">{t("Area")}: </span>{deliveryDetails.area}</div>}
          {deliveryDetails.change && <div className="break-words [overflow-wrap:anywhere]"><span className="font-bold text-stone-500">{t("Keep Change")}: </span>{deliveryDetails.change}</div>}
        </div>
      )}

      {/* Receipt Footer with Sub Total, Discount, Charges, VAT and Grand Total */}
      <div className="border-t border-dashed border-stone-400 pt-3 mt-3 space-y-1.5 text-[11px]">
        <div className="flex justify-between text-stone-600">
          <span>{t("Sub Total")}</span>
          <span>{formatAmount(summary.subtotal)}</span>
        </div>

        {displayDiscount > 0 && (
          <div className="flex justify-between font-bold text-red-600">
            <span>{t("Discount")}</span>
            <span>-{formatAmount(displayDiscount)}</span>
          </div>
        )}

        {summary.charges !== undefined && summary.charges > 0 && (
          <div className="flex justify-between text-stone-600">
            <span>{t("Charges")}</span>
            <span>{formatAmount(summary.charges)}</span>
          </div>
        )}

        {summary.deliveryCharge !== undefined && summary.deliveryCharge > 0 && (
          <div className="flex justify-between text-stone-600">
            <span>{t("Delivery Charge")}</span>
            <span>{formatAmount(summary.deliveryCharge)}</span>
          </div>
        )}

        <div className="flex justify-between text-stone-600">
          <span>{t("Net Value")}</span>
          <span>{formatAmount(summary.netValue !== undefined ? summary.netValue : (summary.subtotal - displayDiscount + (summary.charges || 0)))}</span>
        </div>

        {summary.vat !== undefined && summary.vat > 0 && (
          <div className="flex justify-between text-stone-600">
            <span>{t("VAT")}</span>
            <span>{formatAmount(summary.vat)}</span>
          </div>
        )}

        <div className="flex justify-between font-black text-sm text-[#f48120] border-t border-dashed border-stone-400 pt-2 mt-2">
          <span>{t("GRAND TOTAL")}</span>
          <span>{formatAmount(summary.grandTotal)}</span>
        </div>
      </div>

      {customFooter}
    </div>
  );
};
