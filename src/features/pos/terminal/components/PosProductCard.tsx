import type { PosProduct } from "../../types";
import { formatCurrency } from "../../../../utils/formatters";

interface PosProductCardProps {
  product: PosProduct;
  onAdd: (productId: number) => void;
}

const PosProductCard = ({ product, onAdd }: PosProductCardProps) => {
  return (
    <button
      type="button"
      onClick={() => onAdd(product.id)}
      className="
        group relative flex flex-col justify-between
        rounded-xl border border-slate-200 bg-white p-2 text-left
        transition-all duration-300 hover:shadow-lg hover:shadow-[#49293e]/5 hover:-translate-y-0.5
        h-[135px] w-full outline-none focus:ring-2 focus:ring-[#49293e]/20
      "
    >
      <div className="w-full h-[58px] rounded-lg overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center mb-1 shrink-0">
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
      </div>

      <div className="w-full flex-1 flex flex-col justify-between min-h-0">
        <div className="w-full">
          <div className="flex flex-col">
            <h3 className="text-[10px] font-extrabold text-[#49293e] leading-tight line-clamp-1 uppercase tracking-tight">
              {product.name}
            </h3>
            {product.arabicName && (
              <p className="text-[8px] font-semibold text-slate-500 leading-none truncate mt-0.5">
                {product.arabicName}
              </p>
            )}
          </div>
        </div>

        <div className="mt-1 flex items-center justify-between w-full">
          <div className="text-[10px] font-black text-[#49293e] tracking-tight">
            {formatCurrency(product.price)}
          </div>

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
