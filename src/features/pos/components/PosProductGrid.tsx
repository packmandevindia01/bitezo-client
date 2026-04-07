import { Clock3, Plus } from "lucide-react";
import type { PosCategory, PosProduct } from "../types";

interface PosProductGridProps {
  products: PosProduct[];
  activeCategory?: PosCategory;
  search: string;
  onAdd: (productId: number) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const PosProductGrid = ({
  products,
  activeCategory,
  search,
  onAdd,
}: PosProductGridProps) => {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#49293e]/65">
            Menu Library
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">
            {activeCategory?.name ?? "Products"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {search
              ? `Showing results for "${search}" inside this category.`
              : activeCategory?.description ?? "Tap a category to begin billing faster."}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Visible Items
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{products.length}</p>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
          <p className="text-lg font-semibold text-slate-700">No items matched this search.</p>
          <p className="mt-2 text-sm text-slate-500">
            Try a shorter keyword or switch to another category.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {products.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => onAdd(product.id)}
              className="group rounded-[26px] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#49293e]/25 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900">{product.name}</p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
                    {product.sku}
                  </p>
                </div>

                {product.bestseller && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                    Bestseller
                  </span>
                )}
              </div>

              <div className="mt-10 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xl font-semibold text-[#49293e]">{formatCurrency(product.price)}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                    <Clock3 size={13} />
                    {product.prepTime}
                  </p>
                </div>

                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#49293e] text-white shadow-[0_16px_30px_-18px_rgba(73,41,62,0.95)] transition group-hover:scale-105">
                  <Plus size={18} />
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
};

export default PosProductGrid;
