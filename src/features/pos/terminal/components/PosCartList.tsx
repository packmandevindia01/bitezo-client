import { useEffect, useRef } from "react";
import { ReceiptText } from "lucide-react";
import { formatAmount } from "../../../../utils/formatters";

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
  extras?: { id: number; name: string; price: number; qty: number }[];
  modifiers?: { id: number; name: string; qty: number }[];
  product: {
    name: string;
    sku?: string;
    price: number;
    arabicName?: string;
  };
}

interface PosCartListProps {
  cartDetails: CartRow[];
  selectedKey: string | null;
  onSelectRow: (key: string | null) => void;
}

const getNormalizedVariant = (name?: string) => {
  const n = (name || '').toLowerCase().trim();
  if (!n || n === 'main' || n === 'variation') return 'main';
  return n;
};

export const PosCartList = ({ cartDetails, selectedKey, onSelectRow }: PosCartListProps) => {
  const listContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedKey) {
      const [idPart, ...variantParts] = selectedKey.split('-');
      const selectedVar = getNormalizedVariant(variantParts.join('-'));
      const normalizedSelected = `${idPart}-${selectedVar}`.toLowerCase().trim();
      const element = document.getElementById(`cart-row-${normalizedSelected}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    } else if (listContainerRef.current) {
      listContainerRef.current.scrollTo({
        top: listContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [selectedKey, cartDetails.length]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      <div className="grid grid-cols-[1.5fr_0.4fr_0.5fr_0.7fr] border-b border-slate-100 bg-slate-50/80 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        <span>ITEM</span>
        <span className="text-center">QTY</span>
        <span className="text-center">PRICE</span>
        <span className="text-right">TOTAL</span>
      </div>

      <div ref={listContainerRef} className="flex-1 overflow-y-auto py-1 scroll-smooth">
        {cartDetails.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-slate-50/30">
            <ReceiptText className="w-12 h-12 text-slate-200 mb-3" strokeWidth={1.5} />
            <p className="text-sm font-bold text-slate-400 tracking-tight">Active order is empty</p>
          </div>
        ) : (
          cartDetails.map((item) => {
            const normalizedVar = getNormalizedVariant(item.variantName);
            const key = `${item.productId}-${normalizedVar}`;
            const normalizedKey = key.toLowerCase().trim();
            
            let isSelected = false;
            if (selectedKey) {
              const [idPart, ...variantParts] = selectedKey.split('-');
              const selectedVar = getNormalizedVariant(variantParts.join('-'));
              isSelected = `${idPart}-${selectedVar}`.toLowerCase().trim() === normalizedKey;
            }

            return (
              <div
                key={key}
                id={`cart-row-${normalizedKey}`}
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
                      {item.extras.map((ex, i) => (
                        <p key={i} className="text-[9px] font-bold text-blue-600 uppercase leading-none italic">
                          + {ex.name} {ex.qty > 1 ? `(x${ex.qty})` : ""} ({formatAmount(ex.price * ex.qty)})
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Modifiers Display */}
                  {(item.modifiers && item.modifiers.length > 0) && (
                    <div className="mt-0.5 space-y-0.5">
                      {item.modifiers.map((mod, i) => (
                        <p key={i} className="text-[9px] font-bold text-orange-600 uppercase leading-none italic">
                          * {mod.name}
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
                    {formatAmount(item.product.price || 0)}
                  </span>
                </div>

                <div className="text-right flex flex-col items-end">
                  {item.itemDiscount && item.itemDiscount > 0 ? (
                    <>
                      <p className="text-[9px] text-slate-400 line-through font-bold leading-none mb-0.5">
                        {formatAmount(item.lineTotal + item.itemDiscount)}
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
          })
        )}
      </div>
    </div>
  );
};


