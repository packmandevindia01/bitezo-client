import { Clock3, Plus } from "lucide-react";
import { useRef, useMemo, useState, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
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
  const parentRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1);

  // Dynamic column calculation based on container width
  useEffect(() => {
    const updateColumns = () => {
      if (!parentRef.current) return;
      const width = parentRef.current.offsetWidth;
      if (width > 1200) setColumns(4);
      else if (width > 900) setColumns(3);
      else if (width > 600) setColumns(2);
      else setColumns(1);
    };

    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  // Chunk products into rows
  const rows = useMemo(() => {
    const result = [];
    for (let i = 0; i < products.length; i += columns) {
      result.push(products.slice(i, i + columns));
    }
    return result;
  }, [products, columns]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // Approximate height of a product card + gap
    overscan: 5,
  });

  return (
    <section className="flex flex-col rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5 h-[calc(100vh-320px)] min-h-[500px]">
      <div className="flex flex-wrap items-start justify-between gap-3 shrink-0 mb-6">
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

      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto scrollbar-hide pr-1"
        style={{ scrollBehavior: 'smooth' }}
      >
        {products.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
            <p className="text-lg font-semibold text-slate-700">No items matched this search.</p>
            <p className="mt-2 text-sm text-slate-500">
              Try a shorter keyword or switch to another category.
            </p>
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => (
              <div
                key={virtualRow.index}
                className="grid gap-4"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                  paddingBottom: "16px" // gap equivalent
                }}
              >
                {rows[virtualRow.index].map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => onAdd(product.id)}
                    className="group flex flex-col justify-between h-full rounded-[26px] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#49293e]/25 hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-slate-900 truncate">{product.name}</p>
                        <p className="mt-1 text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
                          {product.sku}
                        </p>
                      </div>

                      {product.bestseller && (
                        <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                          Best
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex items-end justify-between gap-3">
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
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default PosProductGrid;

