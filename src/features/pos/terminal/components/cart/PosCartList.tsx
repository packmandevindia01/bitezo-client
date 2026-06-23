import { useEffect, useRef, useCallback } from "react";
import { ReceiptText } from "lucide-react";
import { PosCartItemCard, type CartRow } from "./PosCartItemCard";

interface PosCartListProps {
  cartDetails: CartRow[];
  selectedKey: string | null;
  onSelectRow: (key: string | null) => void;
}

export const PosCartList = ({ cartDetails, selectedKey, onSelectRow }: PosCartListProps) => {
  const listContainerRef = useRef<HTMLDivElement>(null);

  const handleSelectRow = useCallback((key: string | null) => {
    onSelectRow(key);
  }, [onSelectRow]);

  useEffect(() => {
    if (selectedKey) {
      const element = document.getElementById(`cart-row-${selectedKey}`);
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
          cartDetails.map((item) => (
            <PosCartItemCard
              key={item.uniqueId}
              item={item}
              isSelected={selectedKey === item.uniqueId}
              onSelectRow={handleSelectRow}
            />
          ))
        )}
      </div>
    </div>
  );
};


