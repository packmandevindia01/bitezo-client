import { useRef, useMemo, useState, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { PosCategory, PosProduct } from "../types";

interface PosProductGridProps {
  products: PosProduct[];
  activeCategory?: PosCategory;
  search: string;
  onAdd: (productId: number) => void;
}

const PosProductGrid = ({
  products,
  onAdd,
}: PosProductGridProps) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    const updateColumns = () => {
      if (!parentRef.current) return;
      const width = parentRef.current.offsetWidth;
      if (width > 1200) setColumns(4);
      else if (width > 800) setColumns(3);
      else if (width > 500) setColumns(2);
      else setColumns(1);
    };

    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

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
    estimateSize: () => 300, 
    overscan: 5,
  });

  return (
    <section className="flex-1 bg-transparent overflow-hidden">
      <div
        ref={parentRef}
        className="h-full overflow-y-auto scrollbar-hide"
      >
        {products.length === 0 ? (
          <div className="rounded-[40px] border-2 border-dashed border-slate-100 bg-white px-6 py-20 text-center shadow-sm">
            <p className="text-xl font-bold text-slate-300">No items matched this search.</p>
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
                className="grid gap-6 xl:gap-10"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                  paddingBottom: "40px"
                }}
              >
                {rows[virtualRow.index].map((product) => (
                  <div
                    key={product.id}
                    className="
                      group relative flex flex-col justify-between
                      rounded-[32px] xl:rounded-[40px] border border-slate-50 bg-white p-6 xl:p-8
                      transition-all duration-300 hover:shadow-2xl hover:shadow-[#49293e]/10 hover:-translate-y-2
                    "
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg xl:text-xl font-bold text-black leading-[1.1] pr-4">
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
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        {product.prepTime}
                      </div>
                    </div>

                    <div className="mt-6 xl:mt-8 flex items-end justify-between">
                      <div className="text-2xl xl:text-3xl font-bold text-[#49293e] tracking-tighter">
                        ₹{product.price.toFixed(0)}
                      </div>

                      <button
                        type="button"
                        onClick={() => onAdd(product.id)}
                        className="
                          flex h-12 w-12 xl:h-14 xl:w-14 items-center justify-center 
                          rounded-full bg-[#49293e] text-white shadow-xl shadow-[#49293e]/30
                          transition-all hover:scale-110 active:scale-90
                        "
                      >
                        <svg className="w-6 h-6 xl:w-7 xl:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                          <path d="m3.3 7 8.7 5 8.7-5"/>
                          <path d="M12 22V12"/>
                        </svg>
                      </button>
                    </div>
                  </div>
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
