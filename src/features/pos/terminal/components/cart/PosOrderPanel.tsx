import type { PosQuickAction } from "../../../types";
import { PosCartList } from "./PosCartList";
import { PosOrderSummary } from "./PosOrderSummary";
import { Tag, DollarSign } from "lucide-react";

interface CartRow {
  uniqueId: string;
  productId: number;
  quantity: number;
  lineTotal: number;
  itemDiscount?: number;
  amount: number;
  netValue: number;
  sc: number;
  levy: number;
  vatRate: number;
  vatAmount: number;
  variantName?: string;
  product: {
    name: string;
    sku?: string;
    price: number;
    arabicName?: string;
  };
}

interface PosOrderPanelProps {
  cartActions: PosQuickAction[];
  extraActions: PosQuickAction[];
  cartDetails: CartRow[];
  subtotal: number;
  discount: number;
  tax: number;
  charges: number;
  total: number;
  totalExtras: number;
  baseSubtotal: number;
  deliveryCharge?: number;
  isDelivery?: boolean;
  selectedKey: string | null;
  onSelectRow: (key: string | null) => void;
  onIncrement: (uniqueId: string) => void;
  onDecrement: (uniqueId: string) => void;
  onRemove: (uniqueId: string) => void;
  onMod?: () => void;
  onExtras?: () => void;
  onQty?: () => void;
  onPrice?: () => void;
  onDiscount?: () => void;
  onClearCart?: () => void;
  onOrder?: (print: boolean) => void;
  onSettle?: (shouldPrint: boolean) => void;
  onVoidOrder?: () => void;
  onMessage?: () => void;
  onCom?: () => void;
  onClose?: () => void;
  orderLoading?: boolean;
  isSettling?: boolean;
  isSettledEdit?: boolean;
  selectedTender: string;
  onSelectTender: (tender: string) => void;
  onDeliveryChargeDoubleClick?: () => void;
  tenderOptions: { id: string; label: string }[];
}

export const PosOrderPanel = ({
  cartDetails,
  subtotal,
  discount,
  tax,
  charges,
  total,
  totalExtras,
  baseSubtotal,
  deliveryCharge = 0,
  isDelivery = false,
  selectedKey,
  onSelectRow,
  onIncrement,
  onDecrement,
  onRemove,
  onMod,
  onExtras,
  onQty,
  onPrice,
  onDiscount,
  onOrder,
  onSettle,
  onVoidOrder,
  onMessage,
  onCom,
  onClose,
  orderLoading = false,
  isSettling = false,
  isSettledEdit = false,
  selectedTender,
  onSelectTender,
  onDeliveryChargeDoubleClick,
  tenderOptions,
}: PosOrderPanelProps) => {

  const selectedItem = selectedKey
    ? cartDetails.find((item) => item.uniqueId === selectedKey)
    : null;

  const handleIncrement = () => {
    if (selectedItem) onIncrement(selectedItem.uniqueId);
  };

  const handleDecrement = () => {
    if (!selectedItem) return;
    if (selectedItem.quantity <= 1) {
      return;
    }
    onDecrement(selectedItem.uniqueId);
  };

  const handleVoid = () => {
    if (selectedItem) {
      onRemove(selectedItem.uniqueId);
      onSelectRow(null);
    }
  };

  const hasSelection = !!selectedItem;

  return (
    <aside className="flex h-full flex-col border-l border-slate-200 bg-white shadow-premium relative overflow-hidden">
      {/* Mobile Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="lg:hidden absolute -left-12 top-4 bg-white p-3 rounded-l-2xl shadow-premium text-slate-400"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
          </svg>
        </button>
      )}

      {/* Utility Action Bar */}
      <div className="grid grid-cols-5 gap-1 lg:gap-1.5 p-1.5 lg:p-2 shrink-0 border-b border-slate-100 bg-slate-50/50">
        
        {/* ROW 1: QTY, PRICE, DISCOUNT, VOID, MESSAGE */}
        {/* QTY — manual quantity override */}
        <button
          onClick={onQty}
          disabled={!hasSelection}
          title="Manual Quantity"
          className={`
            h-9 w-full rounded-lg flex flex-col items-center justify-center gap-0.5
            transition-all active:scale-95 border
            ${hasSelection
              ? "bg-white border-slate-200 shadow-sm hover:border-[#002b5c] hover:shadow hover:-translate-y-0.5 cursor-pointer text-[#002b5c]"
              : "bg-transparent border-slate-200 cursor-not-allowed opacity-40 text-slate-400"
            }
          `}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" x2="20" y1="9" y2="9" /><line x1="4" x2="20" y1="15" y2="15" />
            <line x1="10" x2="8" y1="3" y2="21" /><line x1="16" x2="14" y1="3" y2="21" />
          </svg>
          <span className="text-[8px] font-black uppercase tracking-widest">Qty</span>
        </button>

        {/* PRICE */}
        <button
          onClick={onPrice}
          disabled={!hasSelection}
          title="Change Price"
          className={`
            h-9 w-full rounded-lg flex flex-col items-center justify-center gap-0.5
            transition-all active:scale-95 border
            ${hasSelection
              ? "bg-white border-slate-200 shadow-sm hover:border-[#f37021] hover:shadow hover:-translate-y-0.5 cursor-pointer text-[#f37021]"
              : "bg-transparent border-slate-200 cursor-not-allowed opacity-40 text-slate-400"
            }
          `}
        >
          <DollarSign size={14} strokeWidth={2.5} color="currentColor" />
          <span className="text-[8px] font-black uppercase tracking-widest">Price</span>
        </button>

        {/* DISCOUNT */}
        <button
          onClick={onDiscount}
          disabled={cartDetails.length === 0}
          title="Apply Discount"
          className={`
            h-9 w-full rounded-lg flex flex-col items-center justify-center gap-0.5
            transition-all active:scale-95 border
            ${cartDetails.length > 0
              ? "bg-white border-slate-200 shadow-sm hover:border-[#f37021] hover:shadow hover:-translate-y-0.5 cursor-pointer text-[#f37021]"
              : "bg-transparent border-slate-200 cursor-not-allowed opacity-40 text-slate-400"
            }
          `}
        >
          <Tag size={14} strokeWidth={2.5} color="currentColor" />
          <span className="text-[8px] font-black uppercase tracking-widest">Discount</span>
        </button>

        {/* VOID ITEM */}
        <button
          onClick={handleVoid}
          disabled={!hasSelection}
          title="Void selected item"
          className={`
            h-9 w-full rounded-lg flex flex-col items-center justify-center gap-0.5
            transition-all active:scale-95 border
            ${hasSelection
              ? "bg-white border-slate-200 shadow-sm hover:border-red-500 hover:shadow hover:-translate-y-0.5 cursor-pointer text-red-500"
              : "bg-transparent border-slate-200 cursor-not-allowed opacity-40 text-slate-400"
            }
          `}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="m4.9 4.9 14.2 14.2" />
          </svg>
          <span className="text-[8px] font-black uppercase tracking-widest">Void</span>
        </button>

        {/* VOID ORDER */}
        <button
          onClick={onVoidOrder}
          disabled={cartDetails.length === 0}
          title="Void Entire Order"
          className={`
            h-9 w-full rounded-lg flex flex-col items-center justify-center gap-0.5
            transition-all active:scale-95 border
            ${cartDetails.length > 0
              ? "bg-white border-slate-200 shadow-sm hover:border-red-500 hover:shadow hover:-translate-y-0.5 cursor-pointer text-red-500"
              : "bg-transparent border-slate-200 cursor-not-allowed opacity-40 text-slate-400"
            }
          `}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
          <span className="text-[8px] font-black uppercase tracking-widest">Void Ord</span>
        </button>


        {/* ROW 2: QTY -, QTY +, MOD, EXTRAS, VOID ORDER */}
        {/* MINUS — decrement selected row */}
        <button
          onClick={handleDecrement}
          disabled={!hasSelection}
          title="Decrease quantity"
          className={`
            h-9 w-full rounded-lg flex flex-col items-center justify-center gap-0.5
            transition-all active:scale-95 border
            ${hasSelection
              ? "bg-white border-slate-200 shadow-sm hover:border-[#49293e] hover:shadow hover:-translate-y-0.5 cursor-pointer text-[#49293e]"
              : "bg-transparent border-slate-200 cursor-not-allowed opacity-40 text-slate-400"
            }
          `}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <path d="M5 12h14" />
          </svg>
          <span className="text-[8px] font-black uppercase tracking-widest">QTY -</span>
        </button>

        {/* PLUS — increment selected row */}
        <button
          onClick={handleIncrement}
          disabled={!hasSelection}
          title="Increase quantity"
          className={`
            h-9 w-full rounded-lg flex flex-col items-center justify-center gap-0.5
            transition-all active:scale-95 border
            ${hasSelection
              ? "bg-white border-slate-200 shadow-sm hover:border-[#49293e] hover:shadow hover:-translate-y-0.5 cursor-pointer text-[#49293e]"
              : "bg-transparent border-slate-200 cursor-not-allowed opacity-40 text-slate-400"
            }
          `}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span className="text-[8px] font-black uppercase tracking-widest">QTY +</span>
        </button>

        {/* MOD */}
        <button
          onClick={onMod}
          disabled={!hasSelection}
          title="Mod"
          className={`
            h-9 w-full rounded-lg flex flex-col items-center justify-center gap-0.5
            transition-all active:scale-95 border
            ${hasSelection
              ? "bg-white border-slate-200 shadow-sm hover:border-[#002b5c] hover:shadow hover:-translate-y-0.5 cursor-pointer text-[#002b5c]"
              : "bg-transparent border-slate-200 cursor-not-allowed opacity-40 text-slate-400"
            }
          `}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 7h-9" /><path d="M14 17H5" />
            <circle cx="17" cy="17" r="3" /><circle cx="7" cy="7" r="3" />
          </svg>
          <span className="text-[8px] font-black uppercase tracking-widest">Mod</span>
        </button>

        {/* EXTRAS */}
        <button
          onClick={onExtras}
          disabled={!hasSelection}
          title="Extras"
          className={`
            h-9 w-full rounded-lg flex flex-col items-center justify-center gap-0.5
            transition-all active:scale-95 border
            ${hasSelection
              ? "bg-white border-slate-200 shadow-sm hover:border-[#002b5c] hover:shadow hover:-translate-y-0.5 cursor-pointer text-[#002b5c]"
              : "bg-transparent border-slate-200 cursor-not-allowed opacity-40 text-slate-400"
            }
          `}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          <span className="text-[8px] font-black uppercase tracking-widest">Extras</span>
        </button>

        {/* MESSAGE */}
        <button
          onClick={onMessage}
          title="Add Message"
          className="h-9 w-full rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 border bg-white border-slate-200 shadow-sm hover:border-[#002b5c] hover:shadow hover:-translate-y-0.5 cursor-pointer text-[#002b5c]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="text-[8px] font-black uppercase tracking-widest">Msg</span>
        </button>

      </div>



      <PosCartList
        cartDetails={cartDetails}
        selectedKey={selectedKey}
        onSelectRow={onSelectRow}
      />

      <PosOrderSummary
        subtotal={subtotal}
        discount={discount}
        tax={tax}
        charges={charges}
        total={total}
        totalExtras={totalExtras}
        baseSubtotal={baseSubtotal}
        deliveryCharge={deliveryCharge}
        isDelivery={isDelivery}
        onDeliveryChargeDoubleClick={onDeliveryChargeDoubleClick}
        onOrder={onOrder}
        onSettle={onSettle}
        orderLoading={orderLoading}
        isSettling={isSettling}
        isSettledEdit={isSettledEdit}
        selectedTender={selectedTender}
        onSelectTender={onSelectTender}
        tenderOptions={tenderOptions}
        onDiscount={onDiscount}
        onCom={onCom}
      />
    </aside>
  );
};


