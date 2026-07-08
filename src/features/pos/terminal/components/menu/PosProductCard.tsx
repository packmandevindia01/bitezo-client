import { useRef, useState, memo } from "react";
import type { PosProduct } from "../../../types";
import { useCurrency } from "../../../../../hooks/useCurrency";
import { Lock } from "lucide-react";

interface PosProductCardProps {
  product: PosProduct;
  onAdd: (productId: number) => void;
  price?: number;
  hasAlts?: boolean;
  onLongPress?: (productId: number) => void;
}

const PosProductCardBase = ({ product, onAdd, price, hasAlts, onLongPress }: PosProductCardProps) => {
  const { formatAmount } = useCurrency();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isLongPressTriggered, setIsLongPressTriggered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const finalPrice = price !== undefined ? price : product.price;
  const showPrice = finalPrice >= 0 && !hasAlts;

  const startPress = () => {
    setIsLongPressTriggered(false);
    timerRef.current = setTimeout(() => {
      setIsLongPressTriggered(true);
      if (onLongPress) onLongPress(product.id);
    }, 600);
  };

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <button
      type="button"
      onPointerDown={startPress}
      onPointerUp={clearTimer}
      onPointerLeave={clearTimer}
      onPointerCancel={clearTimer}
      // Added prevent default behavior context menu on touch devices
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        if (isLongPressTriggered) return;
        if (!product.isLocked) onAdd(product.id);
      }}
      className="
        group relative flex flex-col justify-between
        rounded-xl border border-slate-200 bg-white text-left overflow-hidden
        transition-all duration-300 hover:shadow-lg hover:shadow-[#49293e]/5 hover:-translate-y-0.5
        h-[95px] md:h-[105px] xl:h-[115px] w-full outline-none focus:ring-2 focus:ring-[#49293e]/20
      "
    >
      <div className="relative w-full h-[55%] overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
        {(product.imageUrl && !imageError) ? (
          <img 
            src={product.imageUrl} 
            alt={product.name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className="text-sm font-black text-slate-300 uppercase select-none">
            {product.name.substring(0, 2)}
          </span>
        )}
      </div>

      {/* Price Badge Overlay - Moved outside overflow-hidden container */}
      {showPrice && (
        <div className="absolute top-1 right-1 flex flex-col items-end gap-1 z-10">
          {price !== undefined && price < product.price && (
            <div className="bg-red-500/90 px-1 py-0.5 rounded text-[8px] font-bold text-white shadow-sm border border-red-600 line-through select-none">
              {formatAmount(product.price)}
            </div>
          )}
          <div className="flex gap-1 items-center">
            {product.isIncl && (
              <div className="bg-green-500 px-1.5 py-0.5 rounded-md text-[8px] font-black text-white shadow-md border border-green-600 select-none">
                INCL
              </div>
            )}
            <div className="bg-[#49293e] px-1.5 py-0.5 rounded-md text-[9px] font-black text-white shadow-md border border-[#49293e]/50 select-none">
              {formatAmount(finalPrice)}
            </div>
          </div>
        </div>
      )}

      <div className="w-full h-[45%] flex flex-col justify-center items-center px-1.5 py-1 overflow-hidden bg-white">
        <div className="w-full flex flex-col items-center justify-center text-center">
          <h3 className="text-[10px] lg:text-[11px] font-extrabold text-[#49293e] leading-[1.1] line-clamp-2 uppercase tracking-tight break-words">
            {product.name}
          </h3>
          {product.arabicName && (
            <p className="text-[10px] lg:text-[11px] font-bold text-slate-500 leading-[1.2] line-clamp-1 mt-0.5 break-words">
              {product.arabicName}
            </p>
          )}
        </div>
      </div>

      {/* Lock Overlay - Moved to cover whole card */}
      {product.isLocked && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-20">
          <div className="bg-slate-800/80 p-2 rounded-full text-white shadow-lg backdrop-blur-sm">
            <Lock size={16} className="opacity-90" />
          </div>
        </div>
      )}
    </button>
  );
};

export const PosProductCard = memo(PosProductCardBase, (prev, next) => {
  return (
    prev.product.id === next.product.id &&
    prev.product.price === next.product.price &&
    prev.product.isLocked === next.product.isLocked &&
    prev.product.isIncl === next.product.isIncl &&
    prev.product.name === next.product.name &&
    prev.product.imageUrl === next.product.imageUrl &&
    prev.price === next.price &&
    prev.hasAlts === next.hasAlts
  );
});
