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
        rounded-xl border border-slate-200 bg-white p-3 text-left
        transition-all duration-300 hover:shadow-lg hover:shadow-[#49293e]/5 hover:-translate-y-1
        h-full w-full outline-none focus:ring-2 focus:ring-[#49293e]/20
      "
    >
      <div className="w-full">
        <div className="flex justify-between items-start mb-0.5">
          <h3 className="text-sm font-bold text-[#49293e] leading-tight line-clamp-2 pr-1 uppercase tracking-tight">
            {product.name}
          </h3>
        </div>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
          {product.sku}
        </p>
      </div>

      <div className="mt-2 flex items-center justify-between w-full">
        <div className="text-base font-bold text-[#49293e] tracking-tight">
          {formatCurrency(product.price)}
        </div>

        <div
          className="
            flex h-8 w-8 items-center justify-center 
            rounded-lg bg-[#49293e] text-white shadow-md shadow-[#49293e]/10
            transition-all group-hover:scale-110 active:scale-95
          "
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5v14" />
          </svg>
        </div>
      </div>
    </button>
  );
};

export default PosProductCard;
