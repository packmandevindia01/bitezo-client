import type { PosProduct } from "../../types";
import { formatAmount } from "../../../../utils/formatters";

interface PosProductCardProps {
  product: PosProduct;
  onAdd: (productId: number) => void;
  price?: number;
  hasAlts?: boolean;
}

const PosProductCard = ({ product, onAdd, price, hasAlts }: PosProductCardProps) => {
  const finalPrice = price !== undefined ? price : product.price;
  const showPrice = finalPrice > 0 && !hasAlts;

  return (
    <button
      type="button"
      onClick={() => onAdd(product.id)}
      className="
        group relative flex flex-col justify-between
        rounded-xl border border-slate-200 bg-white text-left overflow-hidden
        transition-all duration-300 hover:shadow-lg hover:shadow-[#49293e]/5 hover:-translate-y-0.5
        h-[128px] lg:h-[132px] xl:h-[135px] w-full outline-none focus:ring-2 focus:ring-[#49293e]/20
      "
    >
      <div className="relative w-full h-[54px] lg:h-[58px] xl:h-[60px] overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
        {product.imageUrl ? (
          <img 
            src={product.imageUrl} 
            alt={product.name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <span className="text-sm font-black text-slate-300 uppercase select-none">
            {product.name.substring(0, 2)}
          </span>
        )}

        {/* Price Badge Overlay */}
        {showPrice && (
          <div className="absolute top-1 right-1 bg-white px-1.5 py-0.5 rounded-md text-[9px] font-black text-[#49293e] shadow-[0_2px_4px_rgba(0,0,0,0.1)] border border-slate-100/50 select-none">
            {formatAmount(finalPrice)}
          </div>
        )}
      </div>

      <div className="w-full flex-1 flex flex-col justify-between min-h-0 p-2 pt-1.5">
        <div className="w-full">
          <div className="flex flex-col">
            <h3 className="text-[9px] lg:text-[10px] font-extrabold text-[#49293e] leading-tight line-clamp-3 uppercase tracking-tight break-words">
              {product.name}
            </h3>
            {product.arabicName && (
              <p className="text-[13px] font-bold text-slate-500 leading-tight line-clamp-2 mt-0.5 break-words">
                {product.arabicName}
              </p>
            )}
          </div>
        </div>

        <div className="mt-1 flex items-center justify-end w-full">
          <div
            className="
              flex h-5 w-5 items-center justify-center 
              rounded-full bg-[#49293e] text-white shadow-sm
              transition-all group-hover:scale-110 active:scale-95 shrink-0
            "
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5v14" />
            </svg>
          </div>
        </div>
      </div>
    </button>
  );
};

export default PosProductCard;
