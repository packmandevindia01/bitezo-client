import type { PosProduct } from "../../types";
import { useCurrency } from "../../../../hooks/useCurrency";

interface PosProductCardProps {
  product: PosProduct;
  onAdd: (productId: number) => void;
  price?: number;
  hasAlts?: boolean;
}

const PosProductCard = ({ product, onAdd, price, hasAlts }: PosProductCardProps) => {
  const { formatAmount } = useCurrency();
  const finalPrice = price !== undefined ? price : product.price;
  const showPrice = finalPrice >= 0 && !hasAlts;

  return (
    <button
      type="button"
      onClick={() => onAdd(product.id)}
      className="
        group relative flex flex-col justify-between
        rounded-xl border border-slate-200 bg-white text-left overflow-hidden
        transition-all duration-300 hover:shadow-lg hover:shadow-[#49293e]/5 hover:-translate-y-0.5
        h-[110px] xl:h-[120px] w-full outline-none focus:ring-2 focus:ring-[#49293e]/20
      "
    >
      <div className="relative w-full h-[50px] xl:h-[55px] overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
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
          <div className="absolute top-1 right-1 bg-[#49293e] px-1.5 py-0.5 rounded-md text-[9px] font-black text-white shadow-md border border-[#49293e]/50 select-none">
            {formatAmount(finalPrice)}
          </div>
        )}
      </div>

      <div className="w-full flex-1 flex flex-col justify-start min-h-0 px-2 py-1.5 overflow-hidden">
        <div className="w-full">
          <div className="flex flex-col">
            <h3 className="text-[9px] lg:text-[10px] font-extrabold text-[#49293e] leading-[1.15] line-clamp-2 uppercase tracking-tight break-words">
              {product.name}
            </h3>
            {product.arabicName && (
              <p className="text-[10px] lg:text-[11px] font-bold text-slate-500 leading-[1.2] line-clamp-2 mt-0.5 break-words">
                {product.arabicName}
              </p>
            )}
          </div>
        </div>


      </div>
    </button>
  );
};

export default PosProductCard;
