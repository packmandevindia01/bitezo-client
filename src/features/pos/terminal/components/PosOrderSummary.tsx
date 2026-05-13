import { formatAmount } from "../../../../utils/formatters";

interface PosOrderSummaryProps {
  subtotal: number;
  discount: number;
  tax: number;
  charges: number;
  total: number;
  totalExtras: number;
  baseSubtotal: number;
  onSettle?: () => void;
  onOrder?: () => void;
}

export const PosOrderSummary = ({ subtotal, baseSubtotal, discount, tax, charges, total, totalExtras, onSettle, onOrder }: PosOrderSummaryProps) => {
  return (
    <div className="p-3 bg-slate-50/80 border-t border-slate-200 space-y-3">
      {/* Financial Breakdown */}
      <div className="space-y-1 border-b border-slate-200/60 pb-3">
        <div className="flex justify-between items-center text-[11px] font-bold text-slate-500">
          <span>ITEMS TOTAL</span>
          <span>{formatAmount(baseSubtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between items-center text-[11px] font-bold text-red-500">
            <span>DISCOUNT</span>
            <span>- {formatAmount(discount)}</span>
          </div>
        )}
        {totalExtras > 0 && (
          <div className="flex justify-between items-center text-[11px] font-bold text-blue-500">
            <span>EXTRAS</span>
            <span>{formatAmount(totalExtras)}</span>
          </div>
        )}
        {charges > 0 && (
          <div className="flex justify-between items-center text-[11px] font-bold text-slate-500">
            <span>CHARGES (SC+LEVY)</span>
            <span>{formatAmount(charges)}</span>
          </div>
        )}
        {tax > 0 && (
          <div className="flex justify-between items-center text-[11px] font-bold text-slate-500">
            <span>VAT</span>
            <span>{formatAmount(tax)}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          <button className="h-8 px-4 rounded-lg bg-[#ff9500] text-white text-[10px] font-black uppercase shadow-sm hover:bg-[#e68600] transition-colors active:scale-95">
            Discount
          </button>
        </div>
        <div className="flex flex-col items-end leading-none">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Due</span>
          <span className="text-3xl font-bold text-slate-900 tracking-tighter">
            {formatAmount(total || 0)}
          </span>
        </div>
      </div>

      {/* Payment Methods */}
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

      {/* Bottom Actions */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={onSettle}
            className="h-14 rounded-xl bg-pos-green text-white font-bold text-xs uppercase shadow-premium hover:bg-pos-green-dark active:scale-95 transition-all"
          >
            Settle
          </button>
          <button
            onClick={onSettle}
            className="h-14 rounded-xl bg-pos-green text-white font-bold text-[9px] leading-tight px-1 uppercase shadow-premium hover:bg-pos-green-dark active:scale-95 transition-all"
          >
            Settle & <br />Print
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={onOrder}
            className="h-14 rounded-xl bg-pos-orange text-white font-bold text-xs uppercase shadow-premium hover:bg-pos-orange-hover active:scale-95 transition-all"
          >
            Order
          </button>
          <button
            onClick={onOrder}
            className="h-14 rounded-xl bg-pos-orange text-white font-bold text-[9px] leading-tight px-1 uppercase shadow-premium hover:bg-pos-orange-hover active:scale-95 transition-all"
          >
            Order & <br />Print
          </button>
        </div>
      </div>
    </div>
  );
};


