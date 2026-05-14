import type { PosQuickAction } from "../../types";
import { PosCartList } from "./PosCartList";
import { PosOrderSummary } from "./PosOrderSummary";

interface CartRow {
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
  selectedKey: string | null;
  onSelectRow: (key: string | null) => void;
  onIncrement: (productId: number, variantName?: string) => void;
  onDecrement: (productId: number, variantName?: string) => void;
  onRemove: (productId: number, variantName?: string) => void;
  onMod?: () => void;
  onPrice?: () => void;
  onClearCart?: () => void;
  onOrder?: () => void;
  onClose?: () => void;
  orderLoading?: boolean;
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
  selectedKey,
  onSelectRow,
  onIncrement,
  onDecrement,
  onRemove,
  onMod,
  onPrice,
  onOrder,
  onClose,
  orderLoading
}: PosOrderPanelProps) => {

  // Parse selected key back into productId + variantName
  const selectedItem = selectedKey
    ? cartDetails.find((item) => {
        const key = `${item.productId}-${item.variantName || "main"}`;
        return key === selectedKey;
      })
    : null;

  const handleIncrement = () => {
    if (selectedItem) onIncrement(selectedItem.productId, selectedItem.variantName);
  };

  const handleDecrement = () => {
    if (!selectedItem) return;
    if (selectedItem.quantity <= 1) {
      // Last item — void removes it
      onRemove(selectedItem.productId, selectedItem.variantName);
      onSelectRow(null);
    } else {
      onDecrement(selectedItem.productId, selectedItem.variantName);
    }
  };

  const handleVoid = () => {
    if (selectedItem) {
      onRemove(selectedItem.productId, selectedItem.variantName);
      onSelectRow(null);
    }
  };

  const hasSelection = !!selectedItem;

  return (
    <aside className="flex h-full flex-col border-l border-slate-200 bg-white shadow-premium relative">
      {/* Mobile Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="xl:hidden absolute -left-12 top-4 bg-white p-3 rounded-l-2xl shadow-premium text-slate-400"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
          </svg>
        </button>
      )}

      {/* Utility Action Bar */}
      <div className="grid grid-cols-5 gap-1.5 p-2 shrink-0 border-b border-slate-100 bg-slate-50/50">

        {/* VOID — removes selected row */}
        <button
          onClick={handleVoid}
          disabled={!hasSelection}
          title="Void selected item"
          className={`
            h-12 w-full rounded-lg flex flex-col items-center justify-center gap-0.5
            transition-all active:scale-95 shadow-sm
            ${hasSelection
              ? "bg-red-500 hover:bg-red-600 cursor-pointer"
              : "bg-slate-300 cursor-not-allowed opacity-50"
            }
          `}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="m4.9 4.9 14.2 14.2" />
          </svg>
          <span className="text-[8px] font-black uppercase tracking-widest text-white">Void</span>
        </button>

        {/* MINUS — decrement selected row */}
        <button
          onClick={handleDecrement}
          disabled={!hasSelection}
          title="Decrease quantity"
          className={`
            h-12 w-full rounded-lg flex flex-col items-center justify-center gap-0.5
            transition-all active:scale-95 shadow-sm
            ${hasSelection
              ? "bg-[#49293e] hover:bg-[#3a1f2f] cursor-pointer"
              : "bg-slate-300 cursor-not-allowed opacity-50"
            }
          `}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
            <path d="M5 12h14" />
          </svg>
          <span className="text-[8px] font-black uppercase tracking-widest text-white">QTY -</span>
        </button>

        {/* PLUS — increment selected row */}
        <button
          onClick={handleIncrement}
          disabled={!hasSelection}
          title="Increase quantity"
          className={`
            h-12 w-full rounded-lg flex flex-col items-center justify-center gap-0.5
            transition-all active:scale-95 shadow-sm
            ${hasSelection
              ? "bg-[#49293e] hover:bg-[#3a1f2f] cursor-pointer"
              : "bg-slate-300 cursor-not-allowed opacity-50"
            }
          `}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span className="text-[8px] font-black uppercase tracking-widest text-white">QTY +</span>
        </button>

        {/* MOD */}
        <button
          onClick={onMod}
          disabled={!hasSelection}
          title="Mod"
          className={`
            h-12 w-full rounded-lg flex flex-col items-center justify-center gap-0.5
            transition-all active:scale-95 shadow-sm
            ${hasSelection
              ? "bg-[#002b5c] hover:bg-[#001d3d] cursor-pointer"
              : "bg-slate-300 cursor-not-allowed opacity-50"
            }
          `}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 7h-9" /><path d="M14 17H5" />
            <circle cx="17" cy="17" r="3" /><circle cx="7" cy="7" r="3" />
          </svg>
          <span className="text-[8px] font-black uppercase tracking-widest text-white">Mod</span>
        </button>

        {/* PRICE */}
        <button
          onClick={onPrice}
          disabled={!hasSelection}
          title="Price"
          className={`
            h-12 w-full rounded-lg flex flex-col items-center justify-center gap-0.5
            transition-all active:scale-95 shadow-sm
            ${hasSelection
              ? "bg-[#002b5c] hover:bg-[#001d3d] cursor-pointer"
              : "bg-slate-300 cursor-not-allowed opacity-50"
            }
          `}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" x2="12" y1="2" y2="22" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <span className="text-[8px] font-black uppercase tracking-widest text-white">Price</span>
        </button>
      </div>

      {/* Selection hint */}
      {hasSelection && (
        <div className="px-3 py-1.5 bg-[#49293e]/5 border-b border-[#49293e]/10 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#49293e] animate-pulse" />
          <p className="text-[10px] font-black uppercase tracking-widest text-[#49293e] truncate">
            {selectedItem?.product.name}
          </p>
          <button
            onClick={() => onSelectRow(null)}
            className="ml-auto text-[9px] font-bold text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
      )}

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
        onOrder={onOrder}
        orderLoading={orderLoading}
      />
    </aside>
  );
};


