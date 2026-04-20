import { ReceiptText } from "lucide-react";
import PosActionButton from "./PosActionButton";
import type { PosQuickAction, PosTenderOption } from "../types";

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
  itemCount: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  tenderOptions: PosTenderOption[];
  selectedTender: string;
  onSelectTender: (tenderId: string) => void;
  onIncrement: (productId: number) => void;
  onDecrement: (productId: number) => void;
  onClearCart: () => void;
}


const PosOrderPanel = ({
  cartDetails,
  total,
  onIncrement,
  onDecrement,
  onClose, // Added for mobile
}: PosOrderPanelProps & { onClose?: () => void }) => {
  const UTILITY_ACTIONS = [
    { label: "Void", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m4.9 4.9 14.2 14.2" /></svg>, accent: "gray" },
    { label: "Mod", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7h-9" /><path d="M14 17H5" /><circle cx="17" cy="17" r="3" /><circle cx="7" cy="7" r="3" /></svg>, accent: "gray" },
    { label: "Extra", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 12h8" /><path d="M12 8v8" /></svg>, accent: "gray" },
    { label: "Qty", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="9" y2="9" /><line x1="4" x2="20" y1="15" y2="15" /><line x1="10" x2="8" y1="3" y2="21" /><line x1="16" x2="14" y1="3" y2="21" /></svg>, accent: "gray" },
    { label: "Price", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>, accent: "gray" },
  ];

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

      {/* Utility Actions - ICON ONLY */}
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

      {/* Cart Container - PREMIUM LIST */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        <div className="grid grid-cols-[1.5fr_0.8fr_0.7fr] border-b border-slate-100 bg-slate-50/80 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          <span>ITEM</span>
          <span className="text-center">QTY</span>
          <span className="text-right">PRICE</span>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide py-1">
          {cartDetails.length === 0 ? (
             <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-slate-50/30">
               <ReceiptText className="w-12 h-12 text-slate-200 mb-3" strokeWidth={1.5} />
               <p className="text-sm font-bold text-slate-400 tracking-tight">Active order is empty</p>
             </div>
          ) : (
            cartDetails.map((item) => (
              <div
                key={item.productId}
                className="grid grid-cols-[1.5fr_0.8fr_0.7fr] items-center gap-2 px-4 py-3 border-b border-slate-50 transition-colors hover:bg-slate-50/50 group"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-800 leading-none">{item.product.name}</p>
                </div>

                <div className="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onIncrement(item.productId)}
                    className="flex h-6 w-6 items-center justify-center rounded-md border border-pos-green/40 bg-white text-pos-green-dark text-xs font-bold shadow-sm transition-all hover:border-pos-green active:scale-90"
                  >
                    +
                  </button>
                  <span className="min-w-[1.25rem] text-center text-xs font-bold text-slate-700">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => onDecrement(item.productId)}
                    className="flex h-6 w-6 items-center justify-center rounded-md border border-pos-green/40 bg-white text-pos-green-dark text-xs font-bold shadow-sm transition-all hover:border-pos-green active:scale-90"
                  >
                    -
                  </button>
                </div>

                <div className="text-right flex flex-col items-end">
                  <p className="text-sm font-bold text-slate-900 leading-none">{(item.lineTotal || 0).toFixed(3)}</p>
                  <p className="text-[9px] font-bold text-slate-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    @ {(item.product.price || 0).toFixed(3)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Totals Section - PRODUCTION FOOTER */}
      <div className="p-3 bg-slate-50/80 border-t border-slate-200 space-y-3">
         <div className="flex items-center justify-between">
           <div className="flex gap-1.5">
              <button className="h-8 px-4 rounded-lg bg-pos-green text-white text-[10px] font-bold uppercase shadow-sm hover:bg-pos-green-dark transition-colors active:scale-95">Discount</button>
              <button className="h-8 px-4 rounded-lg bg-pos-green text-white text-[10px] font-bold uppercase shadow-sm hover:bg-pos-green-dark transition-colors active:scale-95">Com</button>
           </div>
           <div className="flex flex-col items-end leading-none">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Due</span>
              <span className="text-3xl font-bold text-slate-900 tracking-tighter">
                {(total || 0).toFixed(3)}
              </span>
           </div>
         </div>

         {/* Payment Methods - REFINED STYLE */}
         <div className="grid grid-cols-5 gap-1.5">
            {["CASH", "CARD", "CREDIT", "MULTI"].map((mode) => (
               <button 
                 key={mode}
                 className={`
                    h-11 rounded-xl border-2 text-[10px] font-bold transition-all shadow-sm active:scale-95
                    ${mode === "CASH" 
                      ? "border-pos-green bg-pos-green/10 text-pos-green-dark" 
                      : "border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600"}
                 `}
               >
                 {mode}
               </button>
            ))}
            <div className="h-11 rounded-xl border-2 border-dashed border-slate-200" />
         </div>

         {/* Bottom Actions - MISSION CRITICAL */}
         <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="grid grid-cols-2 gap-1.5">
               <button className="h-14 rounded-xl bg-pos-green text-white font-bold text-xs uppercase shadow-premium hover:bg-pos-green-dark active:scale-95 transition-all">Settle</button>
               <button className="h-14 rounded-xl bg-pos-green text-white font-bold text-[9px] leading-tight px-1 uppercase shadow-premium hover:bg-pos-green-dark active:scale-95 transition-all">Settle & <br/>Print</button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
               <button className="h-14 rounded-xl bg-pos-orange text-white font-bold text-xs uppercase shadow-premium hover:bg-pos-orange-hover active:scale-95 transition-all">Order</button>
               <button className="h-14 rounded-xl bg-pos-orange text-white font-bold text-[9px] leading-tight px-1 uppercase shadow-premium hover:bg-pos-orange-hover active:scale-95 transition-all">Order & <br/>Print</button>
            </div>
         </div>
      </div>
    </aside>
  );
};

export default PosOrderPanel;
