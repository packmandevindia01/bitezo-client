import PosActionButton from "./PosActionButton";
import type { PosQuickAction } from "../types";
import PosCartList from "./PosCartList";
import PosOrderSummary from "./PosOrderSummary";

interface CartRow {
  productId: number;
  quantity: number;
  lineTotal: number;
  product: {
    name: string;
    sku: string;
    price: number;
  };
}

interface PosOrderPanelProps {
  cartActions: PosQuickAction[];
  extraActions: PosQuickAction[];
  cartDetails: CartRow[];
  total: number;
  onIncrement: (productId: number) => void;
  onDecrement: (productId: number) => void;
  onClose?: () => void;
}

const UTILITY_ACTIONS = [
  { label: "Void", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m4.9 4.9 14.2 14.2" /></svg> },
  { label: "Mod", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7h-9" /><path d="M14 17H5" /><circle cx="17" cy="17" r="3" /><circle cx="7" cy="7" r="3" /></svg> },
  { label: "Extra", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 12h8" /><path d="M12 8v8" /></svg> },
  { label: "Qty", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="9" y2="9" /><line x1="4" x2="20" y1="15" y2="15" /><line x1="10" x2="8" y1="3" y2="21" /><line x1="16" x2="14" y1="3" y2="21" /></svg> },
  { label: "Price", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg> },
];

const PosOrderPanel = ({
  cartDetails,
  total,
  onIncrement,
  onDecrement,
  onClose,
}: PosOrderPanelProps) => {
  return (
    <aside className="flex h-full flex-col border-l border-slate-200 bg-white shadow-premium relative">
      {/* Mobile Close Button */}
      {onClose && (
        <button 
          onClick={onClose}
          className="xl:hidden absolute -left-12 top-4 bg-white p-3 rounded-l-2xl shadow-premium text-slate-400"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
        </button>
      )}

      {/* Utility Actions */}
      <div className="grid grid-cols-5 gap-1.5 p-2 shrink-0 border-b border-slate-100 bg-slate-50/50">
        {UTILITY_ACTIONS.map((action) => (
          <PosActionButton 
            key={action.label}
            accent="gray" 
            noPadding
            title={action.label}
            className="h-12 w-full p-0 rounded-lg shadow-sm transition-all active:scale-95"
          >
            {action.icon}
          </PosActionButton>
        ))}
      </div>

      <PosCartList 
        cartDetails={cartDetails}
        onIncrement={onIncrement}
        onDecrement={onDecrement}
      />

      <PosOrderSummary 
        total={total}
      />
    </aside>
  );
};

export default PosOrderPanel;
