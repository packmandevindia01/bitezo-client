/**
 * One order on the Dine-In table screen, as a card (owner's request 2026-11-12: back to the side-by-side cards, with
 * every detail the Recall preview shows). The ticket inside is the Recall preview's own (SavedOrderTicketBody).
 * Tap: select (the action buttons work on it). Double-tap / Enter / DETAILS: open the full Recall preview.
 */
import React from "react";
import { Loader } from "../../../../../../components/common";
import { SavedOrderTicketBody } from "../savedOrder/SavedOrderTicketBody";

export interface TableOrderCardProps {
  orderId: number;
  orderNo: string | number;
  ticketNo: string | number;
  /** Full order (fetchRecallOrderData); undefined while loading, null when it could not be loaded. */
  order: unknown;
  fallbackDetails?: unknown;
  orderDetailsStr?: string;
  isSelected: boolean;
  isPrinted: boolean;
  onSelect: () => void;
  onOpen: () => void;
}

export const TableOrderCard: React.FC<TableOrderCardProps> = ({
  orderId, orderNo, ticketNo, order, fallbackDetails, orderDetailsStr, isSelected, isPrinted, onSelect, onOpen,
}) => (
  <div
    role="button"
    tabIndex={0}
    aria-pressed={isSelected}
    aria-label={`Order ${orderNo}`}
    onClick={onSelect}
    onDoubleClick={onOpen}
    onKeyDown={(e) => {
      if (e.key === "Enter") { e.preventDefault(); onOpen(); }
      if (e.key === " ") { e.preventDefault(); onSelect(); }
    }}
    className={[
      "w-full sm:w-[340px] sm:shrink-0 flex flex-col rounded-2xl border-2 overflow-hidden text-left cursor-pointer select-none",
      "h-[70vh] sm:h-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#f48120]/50",
      isSelected
        ? "border-[#f48120] shadow-lg shadow-[#f48120]/25"
        : "border-white/10 hover:border-white/30",
    ].join(" ")}
  >
    {/* Card heading */}
    <div className={`px-4 py-2.5 flex items-center gap-2 shrink-0 ${isSelected ? "bg-[#f48120]" : "bg-white/5"}`}>
      <div className="flex-1 min-w-0">
        <div className={`text-[9px] font-bold uppercase tracking-widest ${isSelected ? "text-white/80" : "text-white/40"}`}>
          Order #{orderNo}
        </div>
        <div className="text-sm font-black text-white leading-tight">Ticket #{ticketNo}</div>
      </div>
      {isPrinted && (
        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/25 text-emerald-100 border border-emerald-300/40 shrink-0">
          Printed
        </span>
      )}
      <button
        type="button"
        tabIndex={-1}
        onClick={(e) => { e.stopPropagation(); onOpen(); }}
        className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shrink-0 transition-colors ${
          isSelected ? "bg-white/20 hover:bg-white/30 text-white" : "bg-white/10 hover:bg-white/20 text-white/70"
        }`}
        aria-label={`Details of order ${orderNo}`}
      >
        Details
      </button>
    </div>

    {/* The Recall ticket */}
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#faf8f5]">
      {order === undefined ? (
        <div className="h-full flex items-center justify-center py-10">
          <Loader text="Loading order…" />
        </div>
      ) : order === null ? (
        <div className="h-full flex items-center justify-center p-6 text-center text-[10px] font-black uppercase tracking-widest text-stone-400">
          Could not load this order · tap Details to retry
        </div>
      ) : (
        <SavedOrderTicketBody
          order={order}
          orderId={orderId}
          orderDetailsStr={orderDetailsStr}
          fallbackDetails={fallbackDetails}
          itemsMaxHeightClass=""
          hideHeading
          className="min-h-full p-4"
        />
      )}
    </div>
  </div>
);
