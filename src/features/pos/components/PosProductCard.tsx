import type { PosProduct } from "../types";
import { formatCurrency } from "../../../utils/formatters";

interface PosProductCardProps {
  product: PosProduct;
  onAdd: (productId: number) => void;
}

const PosProductCard = ({ product, onAdd }: PosProductCardProps) => {
  return (
    <div
      className="
        group relative flex flex-col justify-between
        rounded-[24px] md:rounded-[32px] xl:rounded-[40px] border border-slate-50 bg-white p-4 md:p-6 xl:p-8
        transition-all duration-300 hover:shadow-2xl hover:shadow-[#49293e]/10 hover:-translate-y-2
      "
    >

      <div>
        <div className="flex justify-between items-start mb-1 md:mb-2">
          <h3 className="text-base md:text-lg xl:text-xl font-bold text-black leading-[1.1] pr-4">
            {product.name}
          </h3>

          {product.bestseller && (
            <span className="shrink-0 px-2 py-1 xl:px-3 xl:py-1 rounded-full bg-emerald-50 text-[8px] xl:text-[10px] font-bold text-emerald-600 uppercase tracking-widest border border-emerald-100">
              Bestseller
            </span>
          )}
        </div>
        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em] mb-2 xl:mb-3">
          {product.sku}
        </p>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {product.prepTime}
        </div>
      </div>

      <div className="mt-4 md:mt-6 xl:mt-8 flex items-end justify-between">
        <div className="text-xl md:text-2xl xl:text-3xl font-bold text-[#49293e] tracking-tighter">
          {formatCurrency(product.price)}
        </div>


        <button
          type="button"
          onClick={() => onAdd(product.id)}
          className="
            flex h-10 w-10 md:h-12 md:w-12 xl:h-14 xl:w-14 items-center justify-center 
            rounded-full bg-[#49293e] text-white shadow-xl shadow-[#49293e]/30
            transition-all hover:scale-110 active:scale-90
          "
        >

          <svg className="w-6 h-6 xl:w-7 xl:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            <path d="m3.3 7 8.7 5 8.7-5" />
            <path d="M12 22V12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default PosProductCard;
