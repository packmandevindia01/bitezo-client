import { memo } from "react";
import { useCurrency } from "../../../../../hooks/useCurrency";

export interface CartRow {
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
  price?: number;
  vatAmount: number;
  originalLineTotal?: number;
  variantName?: string;
  extras?: { id: number; name: string; price: number; qty: number }[];
  modifiers?: { id: number; name: string; qty: number; typeName?: string }[];
  product: {
    name: string;
    sku?: string;
    price: number;
    arabicName?: string;
  };
}

interface PosCartItemCardProps {
  item: CartRow;
  isSelected: boolean;
  onSelectRow: (key: string | null) => void;
}

const PosCartItemCardBase = ({ item, isSelected, onSelectRow }: PosCartItemCardProps) => {
  const { formatAmount } = useCurrency();
  const key = item.uniqueId;

  return (
    <div
      id={`cart-row-${key}`}
      onClick={() => onSelectRow(isSelected ? null : key)}
      className={`
        grid grid-cols-[1.5fr_0.4fr_0.5fr_0.7fr] items-center gap-2 px-3 py-1.5 border-b border-slate-50
        cursor-pointer select-none transition-all duration-150
        ${isSelected
          ? "bg-[#49293e]/10 border-l-4 border-l-[#49293e]"
          : "hover:bg-slate-50 border-l-4 border-l-transparent"
        }
      `}
    >
      <div className="min-w-0">
        <p className={`truncate text-[11px] font-normal leading-tight uppercase ${isSelected ? "text-[#49293e]" : "text-slate-800"}`}>
          {item.product.name}
        </p>
        {item.product.arabicName && (
          <p className="text-[10px] font-semibold text-slate-500 leading-tight mt-0.5">
            {item.product.arabicName}
          </p>
        )}

        {/* Extras Display */}
        {(item.extras && item.extras.length > 0) && (
          <div className="mt-1 space-y-0.5">
            {item.extras.map((ex, i) => {
              const totalQty = ex.qty || 1;
              return (
                <p key={i} className="text-[9px] font-bold text-blue-600 uppercase leading-none italic">
                  + {ex.name} {totalQty > 1 ? `(x${totalQty})` : ""} ({formatAmount(ex.price * totalQty)})
                </p>
              );
            })}
          </div>
        )}

        {/* Modifiers Display */}
        {(item.modifiers && item.modifiers.length > 0) && (
          <div className="mt-0.5 space-y-0.5">
            {item.modifiers.map((mod, i) => (
              <p key={i} className="text-[9px] font-bold text-orange-600 uppercase leading-none italic">
                {mod.typeName ? `${mod.typeName}` : "*"} {mod.name}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-center">
        <span className={`text-[11px] font-normal ${isSelected ? "text-[#49293e]" : "text-slate-700"}`}>
          {item.quantity}
        </span>
      </div>

      <div className="flex items-center justify-center">
        <span className={`text-[10px] font-normal ${isSelected ? "text-[#49293e]" : "text-slate-500"}`}>
          {formatAmount(item.price || item.product?.price || 0)}
        </span>
      </div>

      <div className="text-right flex flex-col items-end">
        {item.itemDiscount && item.itemDiscount > 0 ? (
          <>
            <p className="text-[9px] text-slate-400 line-through font-bold leading-none mb-0.5">
              {formatAmount(item.originalLineTotal ?? (item.lineTotal + item.itemDiscount))}
            </p>
            <p className={`text-[11px] font-normal leading-none ${isSelected ? "text-[#49293e]" : "text-red-600"}`}>
              {formatAmount(item.lineTotal || 0)}
            </p>
          </>
        ) : (
          <p className={`text-[11px] font-normal leading-none ${isSelected ? "text-[#49293e]" : "text-slate-900"}`}>
            {formatAmount(item.lineTotal || 0)}
          </p>
        )}
      </div>
    </div>
  );
};

export const PosCartItemCard = memo(PosCartItemCardBase, (prev, next) => {
  return (
    prev.isSelected === next.isSelected &&
    prev.item.uniqueId === next.item.uniqueId &&
    prev.item.quantity === next.item.quantity &&
    prev.item.lineTotal === next.item.lineTotal &&
    prev.item.itemDiscount === next.item.itemDiscount &&
    prev.item.netValue === next.item.netValue &&
    prev.item.extras?.length === next.item.extras?.length &&
    prev.item.modifiers?.length === next.item.modifiers?.length
  );
});
