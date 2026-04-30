import { ReceiptText } from "lucide-react";
import { formatAmount } from "../../../../utils/formatters";

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

interface PosCartListProps {
  cartDetails: CartRow[];
  onIncrement: (productId: number) => void;
  onDecrement: (productId: number) => void;
}

const PosCartList = ({ cartDetails, onIncrement, onDecrement }: PosCartListProps) => {
  return (
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
                <p className="text-sm font-bold text-slate-900 leading-none">{formatAmount(item.lineTotal || 0)}</p>
                <p className="text-[9px] font-bold text-slate-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  @ {formatAmount(item.product.price || 0)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PosCartList;
