import { useCurrency } from "../../../../../hooks/useCurrency";

interface PosOrderSummaryProps {
  subtotal: number;
  discount: number;
  tax: number;
  charges: number;
  total: number;
  totalExtras: number;
  baseSubtotal: number;
  deliveryCharge?: number;
  isDelivery?: boolean;
  onDeliveryChargeDoubleClick?: () => void;
  onSettle?: (shouldPrint: boolean) => void;
  onOrder?: (print: boolean) => void;
  orderLoading?: boolean;
  isSettling?: boolean;
  isSettledEdit?: boolean;
  selectedTender: string;
  onSelectTender: (tender: string) => void;
  tenderOptions: { id: string; label: string }[];
  onDiscount?: () => void;
  onCom?: () => void;
}

export const PosOrderSummary = ({ subtotal, discount, tax, charges, total, deliveryCharge = 0, isDelivery = false, onDeliveryChargeDoubleClick, onSettle, onOrder, orderLoading, isSettling, isSettledEdit, selectedTender, onSelectTender, tenderOptions, onDiscount, onCom }: PosOrderSummaryProps) => {
  const { formatAmount } = useCurrency();
  return (
    <div className="shrink-0 p-2 lg:p-2.5 bg-slate-50/80 border-t border-slate-200 space-y-1.5 lg:space-y-2">
      {/* Financial Breakdown */}
      <div className="flex gap-4 border-b border-slate-200/60 pb-1.5">
        <div className="flex-1 space-y-0.5">
          <div className="flex justify-between items-center text-[11px] font-extrabold text-slate-600 leading-tight">
            <span>Sub Total</span>
            <span>{formatAmount(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between items-center text-[11px] font-extrabold text-slate-600 leading-tight">
              <span>Discount</span>
              <span>{formatAmount(discount)}</span>
            </div>
          )}
          {charges > 0 && (
            <div className="flex justify-between items-center text-[11px] font-extrabold text-slate-600 leading-tight">
              <span>Charges</span>
              <span>{formatAmount(charges)}</span>
            </div>
          )}
        </div>
        <div className="flex-1 space-y-0.5 border-l border-slate-200/50 pl-4">
          <div className="flex justify-between items-center text-[11px] font-extrabold text-slate-600 leading-tight">
            <span>Net Value</span>
            <span>{formatAmount(subtotal - discount + charges)}</span>
          </div>
          {(isDelivery || deliveryCharge > 0) && (
            <div
              onDoubleClick={onDeliveryChargeDoubleClick}
              className={`flex justify-between items-center text-[11px] font-extrabold leading-tight group
                ${onDeliveryChargeDoubleClick
                  ? 'text-[#49293e] cursor-pointer select-none rounded px-1 -mx-1 hover:bg-[#49293e]/8 active:bg-[#49293e]/15 transition-colors'
                  : 'text-slate-600'
                }
              `}
              title="Double-click to change delivery zone"
            >
              <span className="flex items-center gap-1">
                Delivery Charge
                {onDeliveryChargeDoubleClick && (
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40 group-hover:opacity-80 transition-opacity">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                )}
              </span>
              <span>{formatAmount(deliveryCharge)}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-[11px] font-extrabold text-slate-600 leading-tight">
            <span>VAT</span>
            <span>{formatAmount(tax)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 mt-1">
          <button 
            onClick={onDiscount}
            className="h-8 lg:h-9 px-3 rounded-lg border-2 border-[#f37021] text-[#f37021] text-[9px] font-bold uppercase transition-all hover:bg-[#f37021] hover:text-white active:scale-95 shadow-sm"
          >
            Discount
          </button>
          <button 
            onClick={onCom}
            className="h-8 lg:h-9 px-3 rounded-lg border-2 border-[#002b5c] text-[#002b5c] text-[9px] font-bold uppercase transition-all hover:bg-[#002b5c] hover:text-white active:scale-95 shadow-sm"
          >
            COM
          </button>
        </div>
        <div className="flex flex-col items-end leading-none mt-1">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Grand Total</span>
          <span className="text-[24px] lg:text-[28px] font-black text-slate-900 tracking-tighter">
            {formatAmount(total || 0)}
          </span>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="grid grid-cols-5 gap-1.5">
        {(tenderOptions || []).map((mode) => (
          <button
            key={mode.id}
            onClick={() => onSelectTender(mode.id)}
            className={`
              h-9 lg:h-10 rounded-xl border-2 text-[9px] font-bold transition-all shadow-sm active:scale-95 uppercase
              ${selectedTender === mode.id
                ? "border-pos-green bg-pos-green/10 text-pos-green-dark"
                : "border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600"}
            `}
          >
            {mode.label}
          </button>
        ))}
        <div className="h-9 lg:h-10 rounded-xl border-2 border-dashed border-slate-200" />
      </div>

      {/* Bottom Actions */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onSettle && onSettle(false)}
            disabled={orderLoading || isSettling || total <= 0}
            className="h-10 lg:h-12 rounded-xl bg-pos-green text-white font-bold text-[10px] uppercase shadow-premium hover:bg-pos-green-dark active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Settle
          </button>
          <button
            onClick={() => onSettle && onSettle(true)}
            disabled={orderLoading || isSettling || total <= 0}
            className="h-10 lg:h-12 rounded-xl bg-pos-green text-white font-bold text-[9px] leading-tight px-1 uppercase shadow-premium hover:bg-pos-green-dark active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Settle & <br />Print
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onOrder && onOrder(false)}
            disabled={orderLoading || isSettling || isSettledEdit || total <= 0}
            className="h-10 lg:h-12 rounded-xl bg-pos-orange text-white font-bold text-[10px] uppercase shadow-premium hover:bg-pos-orange-hover active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {orderLoading ? "Wait..." : "Order"}
          </button>
          <button
            onClick={() => onOrder && onOrder(true)}
            disabled={orderLoading || isSettling || isSettledEdit || total <= 0}
            className="h-10 lg:h-12 rounded-xl bg-pos-orange text-white font-bold text-[9px] leading-tight px-1 uppercase shadow-premium hover:bg-pos-orange-hover active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {orderLoading ? "Wait..." : "Order & Print"}
          </button>
        </div>
      </div>
    </div>
  );
};


