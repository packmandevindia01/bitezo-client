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
  selectedKey: string | null;
  onSelectRow: (key: string | null) => void;
  onIncrement: (productId: number, variantName?: string) => void;
  onDecrement: (productId: number, variantName?: string) => void;
  onRemove: (productId: number, variantName?: string) => void;
  onMod?: () => void;
  onExtras?: () => void;
  onQty?: () => void;
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
  onExtras,
  onQty,
  onOrder,
  onClose,
  orderLoading
}: PosOrderPanelProps) => {

  const getNormalizedVariant = (name?: string) => {
    const n = (name || '').toLowerCase().trim();
    if (!n || n === 'main' || n === 'variation') return 'main';
    return n;
  };

  // Parse selected key back into productId + variantName
  const selectedItem = selectedKey
    ? cartDetails.find((item) => {
        const itemVar = getNormalizedVariant(item.variantName);
        const itemKey = `${item.productId}-${itemVar}`.toLowerCase().trim();
        
        const [selId, ...selVarParts] = selectedKey.split('-');
        const selVar = getNormalizedVariant(selVarParts.join('-'));
        const selKeyNormalized = `${selId}-${selVar}`.toLowerCase().trim();
        
        return itemKey === selKeyNormalized;
      })
    : null;

  const handleIncrement = () => {
    if (selectedItem) onIncrement(selectedItem.productId, selectedItem.variantName);
  };

  const handleDecrement = () => {
    if (!selectedItem) return;
    if (selectedItem.quantity <= 1) {
      // Set as minimum 1 so cashier cannot reduce below 1 (must use Void to remove)
      return;
    }
    onDecrement(selectedItem.productId, selectedItem.variantName);
  };

  const handleVoid = () => {
    if (selectedItem) {
      onRemove(selectedItem.productId, selectedItem.variantName);
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
      <div className="grid grid-cols-6 gap-1 lg:gap-1.5 p-1.5 lg:p-2 shrink-0 border-b border-slate-100 bg-slate-50/50">

        {/* VOID — removes selected row */}
        <button
          onClick={handleVoid}
          disabled={!hasSelection}
          title="Void selected item"
          className={`
            h-11 lg:h-12 w-full rounded-lg flex flex-col items-center justify-center gap-0.5
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
            h-11 lg:h-12 w-full rounded-lg flex flex-col items-center justify-center gap-0.5
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
            h-11 lg:h-12 w-full rounded-lg flex flex-col items-center justify-center gap-0.5
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
            h-11 lg:h-12 w-full rounded-lg flex flex-col items-center justify-center gap-0.5
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

        {/* EXTRAS */}
        <button
          onClick={onExtras}
          disabled={!hasSelection}
          title="Extras"
          className={`
            h-11 lg:h-12 w-full rounded-lg flex flex-col items-center justify-center gap-0.5
            transition-all active:scale-95 shadow-sm
            ${hasSelection
              ? "bg-[#002b5c] hover:bg-[#001d3d] cursor-pointer"
              : "bg-slate-300 cursor-not-allowed opacity-50"
            }
          `}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          <span className="text-[8px] font-black uppercase tracking-widest text-white">Extras</span>
        </button>

        {/* QTY — manual quantity override */}
        <button
          onClick={onQty}
          disabled={!hasSelection}
          title="Manual Quantity"
          className={`
            h-11 lg:h-12 w-full rounded-lg flex flex-col items-center justify-center gap-0.5
            transition-all active:scale-95 shadow-sm
            ${hasSelection
              ? "bg-[#002b5c] hover:bg-[#001d3d] cursor-pointer"
              : "bg-slate-300 cursor-not-allowed opacity-50"
            }
          `}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" x2="20" y1="9" y2="9" /><line x1="4" x2="20" y1="15" y2="15" />
            <line x1="10" x2="8" y1="3" y2="21" /><line x1="16" x2="14" y1="3" y2="21" />
          </svg>
          <span className="text-[8px] font-black uppercase tracking-widest text-white">Qty</span>
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
        onOrder={onOrder}
        orderLoading={orderLoading}
      />
    </aside>
  );
};


