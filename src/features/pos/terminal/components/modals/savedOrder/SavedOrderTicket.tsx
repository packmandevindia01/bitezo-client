/**
 * Shared pieces of the saved-order windows (Recall details, Settled details): the window frame, the button
 * column, meta fields, the item-discount row, extras / modifiers / messages under a line, the delivery block
 * and the totals footer. Split out of the two windows on 2026-11-11; the markup is exactly what both showed
 * (guarded by the savedOrderWindowsSnapshot test), so the few look differences are options here.
 */
import React from "react";
import Modal from "../../../../../../components/common/Modal";
import { Loader } from "../../../../../../components/common";
import { formatAmount } from "../../../../../../utils/currency";
import { modifierLabelOf } from "../../../../utils/modifierLabel";
import { t } from "../../../../utils/posLocalization";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;

/** Recall details and Settled details lay out the rows under an item slightly differently. */
export type TicketVariant = "recall" | "settled";

const LINE_GRID = "grid grid-cols-[28px_minmax(0,1fr)_55px_65px] gap-2";
const WRAP = "min-w-0 break-words [overflow-wrap:anywhere] [word-break:break-word]";

/* ── Window frame ─────────────────────────────────────────────────────────── */

export const SavedOrderWindow: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  /** Contents of the dark header bar (title, badges, close button). */
  header: React.ReactNode;
  loading: boolean;
  loadingText: string;
  hasOrder: boolean;
  /** The ticket and the button column. */
  children: React.ReactNode;
}> = ({ isOpen, onClose, header, loading, loadingText, hasOrder, children }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    size="lg"
    noPadding
    className="bg-[#262626] border border-stone-800 shadow-2xl rounded-2xl overflow-hidden w-full max-w-[520px] md:max-w-[550px]"
  >
    <div className="bg-[#1e1e1e] border-b border-stone-800 text-stone-100 py-3.5 px-6 flex justify-between items-center">
      {header}
    </div>

    {loading ? (
      <div className="py-24 flex items-center justify-center bg-stone-900/40">
        <Loader text={loadingText} />
      </div>
    ) : hasOrder ? (
      <div className="flex flex-col md:flex-row min-h-[420px] bg-stone-950/80">{children}</div>
    ) : (
      <div className="py-20 flex flex-col items-center justify-center text-stone-400 bg-stone-900/40">
        <svg className="w-12 h-12 text-stone-600 mb-3 animate-bounce" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
        <p className="text-xs font-bold uppercase tracking-widest">{t("No Order Data Available")}</p>
      </div>
    )}
  </Modal>
);

/* ── Button column ────────────────────────────────────────────────────────── */

export const SavedOrderActions: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="w-full md:w-28 shrink-0 bg-stone-900 border-t md:border-t-0 md:border-l border-stone-800 p-3 flex flex-row md:flex-col gap-2 justify-stretch items-stretch overflow-x-auto">
    {children}
  </div>
);

const ACTION_TONES = {
  kot: "bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-stone-100",
  guest: "bg-stone-700 hover:bg-stone-600 active:scale-95 text-stone-100",
  edit: "bg-[#49293e] hover:bg-[#5c3450] active:scale-95 text-stone-100",
  settle: "bg-[#a35c24] hover:bg-[#b8692a] active:scale-95 text-stone-100",
  close: "bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-300 hover:text-white",
} as const;

export const TicketActionButton: React.FC<{
  tone: keyof typeof ACTION_TONES;
  onClick: () => void;
  disabled?: boolean;
  /** Fade the button while disabled. */
  dimWhenDisabled?: boolean;
  title?: string;
  children: React.ReactNode;
}> = ({ tone, onClick, disabled, dimWhenDisabled, title, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={
      `flex-1 md:flex-initial h-12 md:h-14 rounded-xl ${ACTION_TONES[tone]} font-black text-[10px] uppercase tracking-widest transition-all flex flex-col justify-center items-center gap-1 ` +
      `${tone === "close" ? "border border-stone-700/50 " : ""}shadow-md${dimWhenDisabled ? " disabled:opacity-50" : ""}`
    }
    title={title}
  >
    {children}
  </button>
);

/* ── Meta fields (Order No, Emp, Type …) ──────────────────────────────────── */

export const MetaField: React.FC<{
  label: React.ReactNode;
  /** Layout classes before the wrapping ones, e.g. "text-right" or "col-span-2 mt-1". */
  className?: string;
  valueClassName?: string;
  children: React.ReactNode;
}> = ({ label, className, valueClassName = "font-bold", children }) => (
  <div className={`${className ? `${className} ` : ""}min-w-0 break-words [overflow-wrap:anywhere]`}>
    <span className="text-stone-500">{label}: </span>
    <span className={valueClassName}>{children}</span>
  </div>
);

/* ── Rows under an item ───────────────────────────────────────────────────── */

export const ItemDiscountRow: React.FC<{ variant: TicketVariant; discount: number; net: number }> = ({ variant, discount, net }) => (
  <div className={variant === "recall"
    ? `${LINE_GRID} items-start text-[11px] leading-tight mt-0.5 font-bold`
    : `${LINE_GRID} text-[11px] items-start font-bold`}>
    <div></div>
    <div className="col-span-2 text-right text-stone-700 whitespace-nowrap">
      {t("Disc")} : {formatAmount(discount)}
    </div>
    <div className="text-right text-stone-900 shrink-0">
      {formatAmount(net)}
    </div>
  </div>
);

/** One row under an item: "+ extra", "* modifier" or "💬 message". */
const AddonRow: React.FC<{ variant: TicketVariant; message?: boolean; children: React.ReactNode }> = ({ variant, message, children }) =>
  variant === "recall" ? (
    <div className={`${LINE_GRID} items-start text-[9px] leading-tight mt-0.5`}>
      <div></div>
      <div className={`col-span-2 font-medium ${WRAP} ${message ? "text-purple-600" : "text-[#f48120]"}`}>{children}</div>
      <div className="text-right font-medium text-[#f48120] shrink-0"></div>
    </div>
  ) : (
    <div className={`${LINE_GRID} text-[9px] ${message ? "text-purple-600" : "text-[#f48120]"} font-medium pl-6 italic items-start`}>
      <div className={`col-span-3 ${WRAP}`}>{children}</div>
      <div className="text-right shrink-0"></div>
    </div>
  );

/** Extras, then modifiers, then kitchen messages of one item. */
export const LineAddons: React.FC<{ variant: TicketVariant; extras: Row[]; standardMods: Row[]; messages: Row[] }> = ({
  variant, extras, standardMods, messages,
}) => (
  <>
    {(extras || []).map((ex: Row, idx: number) => {
      const exQty = Number(ex.qty ?? 1);
      return (
        <AddonRow key={`ex-${idx}`} variant={variant}>
          + {exQty > 1 ? `${exQty} x ` : ""}{ex.modifierName || ex.name || "Extra"}
        </AddonRow>
      );
    })}
    {(standardMods || []).map((mod: Row, idx: number) => (
      <AddonRow key={`mod-${idx}`} variant={variant}>
        * {modifierLabelOf(mod)}
      </AddonRow>
    ))}
    {(messages || []).map((msg: Row, idx: number) => (
      <AddonRow key={`msg-${idx}`} variant={variant} message>
        💬 {msg.modifierName || msg.name || ""}
      </AddonRow>
    ))}
  </>
);

/* ── Delivery block ───────────────────────────────────────────────────────── */

export interface TicketDeliveryDetails {
  mobile?: string;
  callBack?: string;
  customerName?: string;
  flat?: string;
  building?: string;
  block?: string;
  road?: string;
  area?: string;
  change?: string;
}

export const DeliveryDetailsBlock: React.FC<{ details: TicketDeliveryDetails }> = ({ details }) => {
  const row = (label: React.ReactNode, value?: string) =>
    value ? <div className="break-words [overflow-wrap:anywhere]"><span className="font-bold text-stone-500">{label}: </span>{value}</div> : null;
  return (
    <div className="border-t border-dashed border-stone-400 pt-3 mt-3 text-[10px] space-y-0.5 text-stone-600 min-w-0">
      <div className="font-bold uppercase tracking-wider text-stone-400 mb-1">{t("Delivery Details")}</div>
      {row(t("Mobile"), details.mobile)}
      {row("Call Back", details.callBack)}
      {row(t("Customer"), details.customerName)}
      {row(t("Flat No"), details.flat)}
      {row(t("Building"), details.building)}
      {row(t("Block"), details.block)}
      {row(t("Road"), details.road)}
      {row(t("Area"), details.area)}
      {row(t("Keep Change"), details.change)}
    </div>
  );
};

/* ── Totals footer ────────────────────────────────────────────────────────── */

export interface ShownFooter {
  subTotal: number;
  discount: number;
  charges: number;
  netValue: number;
  vat: number;
  delivery: number;
  grandTotal: number;
}

/** Sub Total, Discount, Charges, Net Value, Delivery, VAT, Grand Total (values already balanced to the fil). */
export const SavedOrderTotals: React.FC<{
  shown: ShownFooter;
  /** Unbalanced values decide which optional rows show. */
  discount: number;
  charges: number;
  delivery: number;
  showVat: boolean;
}> = ({ shown, discount, charges, delivery, showVat }) => (
  <div className="border-t border-dashed border-stone-400 pt-3 mt-4 space-y-1 text-[11px]">
    <div className="flex justify-between items-center text-stone-600">
      <span>{t("Sub Total")}</span>
      <span>{formatAmount(shown.subTotal)}</span>
    </div>
    {discount > 0 && (
      <div className="flex justify-between items-center text-red-600">
        <span>{t("Discount")}</span>
        <span>-{formatAmount(shown.discount)}</span>
      </div>
    )}
    {charges > 0 && (
      <div className="flex justify-between items-center text-stone-600">
        <span>{t("Charges")}</span>
        <span>{formatAmount(shown.charges)}</span>
      </div>
    )}
    <div className="flex justify-between items-center text-stone-600">
      <span>{t("Net Value")}</span>
      <span>{formatAmount(shown.netValue)}</span>
    </div>
    {delivery > 0 && (
      <div className="flex justify-between items-center text-stone-600">
        <span>{t("Delivery Charge")}</span>
        <span>{formatAmount(shown.delivery)}</span>
      </div>
    )}
    {showVat && (
      <div className="flex justify-between items-center text-stone-600">
        <span>{t("VAT")}</span>
        <span>{formatAmount(shown.vat)}</span>
      </div>
    )}
    <div className="flex justify-between items-center text-xs font-bold text-stone-900 uppercase pt-2 border-t border-dashed border-stone-300">
      <span>{t("Grand Total")}</span>
      <span className="text-base font-black text-[#f48120]">{formatAmount(shown.grandTotal)}</span>
    </div>
  </div>
);
