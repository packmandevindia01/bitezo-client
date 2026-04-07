import { Minus, Plus, ReceiptText, Trash2 } from "lucide-react";
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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const PosOrderPanel = ({
  cartActions,
  extraActions,
  cartDetails,
  itemCount,
  subtotal,
  discount,
  tax,
  total,
  tenderOptions,
  selectedTender,
  onSelectTender,
  onIncrement,
  onDecrement,
  onClearCart,
}: PosOrderPanelProps) => {
  return (
    <aside className="flex h-full flex-col rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#49293e]/65">
            Running Bill
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Current Order</h2>
          <p className="mt-1 text-sm text-slate-500">{itemCount} items in the active cart.</p>
        </div>

        <button
          type="button"
          onClick={onClearCart}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100"
          aria-label="Clear cart"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-5 gap-2">
        {cartActions.map((action) => (
          <PosActionButton key={action.id} className="px-2 text-xs">
            {action.label}
          </PosActionButton>
        ))}
      </div>

      <div className="mt-5 flex-1 overflow-hidden rounded-[24px] border border-slate-200">
        <div className="grid grid-cols-[1.8fr_0.7fr_0.9fr] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          <span>Item</span>
          <span className="text-center">Qty</span>
          <span className="text-right">Price</span>
        </div>

        <div className="max-h-[360px] overflow-y-auto">
          {cartDetails.length === 0 ? (
            <div className="flex h-56 flex-col items-center justify-center px-6 text-center">
              <ReceiptText size={28} className="text-slate-300" />
              <p className="mt-4 text-sm font-semibold text-slate-700">No products added yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Select an item from the product grid to start the order.
              </p>
            </div>
          ) : (
            cartDetails.map((item) => (
              <div
                key={item.productId}
                className="grid grid-cols-[1.8fr_0.7fr_0.9fr] items-center gap-3 border-b border-slate-100 px-4 py-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{item.product.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                    {item.product.sku}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => onDecrement(item.productId)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-[#49293e]/25 hover:text-[#49293e]"
                    aria-label={`Decrease ${item.product.name}`}
                  >
                    <Minus size={14} />
                  </button>

                  <span className="min-w-5 text-center text-sm font-semibold text-slate-900">
                    {item.quantity}
                  </span>

                  <button
                    type="button"
                    onClick={() => onIncrement(item.productId)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-[#49293e]/25 hover:text-[#49293e]"
                    aria-label={`Increase ${item.product.name}`}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    {formatCurrency(item.lineTotal)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatCurrency(item.product.price)} each
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-2">
        {extraActions.map((action) => (
          <PosActionButton key={action.id} accent="warning" className="px-2 text-xs">
            {action.label}
          </PosActionButton>
        ))}
      </div>

      <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between text-slate-600">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>Discount</span>
            <span>- {formatCurrency(discount)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>Tax</span>
            <span>{formatCurrency(tax)}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
          <span className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
            Total
          </span>
          <span className="text-2xl font-semibold text-[#49293e]">{formatCurrency(total)}</span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 xl:grid-cols-4">
        {tenderOptions.map((option) => (
          <PosActionButton
            key={option.id}
            active={option.id === selectedTender}
            onClick={() => onSelectTender(option.id)}
          >
            {option.label}
          </PosActionButton>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <PosActionButton accent="brand" className="min-h-14 text-base">
          Settle
        </PosActionButton>
        <PosActionButton className="min-h-14 text-base">Order</PosActionButton>
      </div>
    </aside>
  );
};

export default PosOrderPanel;
