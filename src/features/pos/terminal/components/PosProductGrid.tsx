import { useRef, useMemo, useState, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { PosProduct, MenuSubCategory, PosAlternative } from "../../types";
import PosProductCard from "./PosProductCard";
import { formatCurrency } from "../../../../utils/formatters";

interface PosProductGridProps {
  products: PosProduct[];
  subCategories: MenuSubCategory[];
  alternatives?: PosAlternative[];
  activeSubCategoryId: number | null;
  onSelectSubCategory: (id: number) => void;
  onBack: () => void;
  onAdd: (productId: number) => void;
  onSelectAlt?: (variant: PosAlternative) => void;
}

const PosProductGrid = ({
  products,
  subCategories,
  alternatives = [],
  activeSubCategoryId,
  onSelectSubCategory,
  onBack,
  onAdd,
  onSelectAlt,
}: PosProductGridProps) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    const updateColumns = () => {
      if (!parentRef.current) return;
      const width = parentRef.current.offsetWidth;
      if (width > 1500) setColumns(8);
      else if (width > 1200) setColumns(7);
      else if (width > 900) setColumns(6);
      else if (width > 600) setColumns(4);
      else setColumns(2);
    };

    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  const showSubCategories = !activeSubCategoryId && subCategories.length > 0 && alternatives.length === 0;
  const showAlternatives = alternatives.length > 0;

  const rows = useMemo(() => {
    let data = [];
    if (showSubCategories) data = subCategories;
    else if (showAlternatives) data = alternatives;
    else data = products;

    const result = [];
    for (let i = 0; i < data.length; i += columns) {
      result.push(data.slice(i, i + columns));
    }
    return result;
  }, [products, subCategories, alternatives, showSubCategories, showAlternatives, columns]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (showSubCategories ? 160 : 120),
    overscan: 5,
  });

  return (
    <section className="flex-1 bg-transparent overflow-hidden flex flex-col">
      {(showAlternatives || (!showSubCategories && activeSubCategoryId)) && (
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-[#49293e] hover:bg-slate-50 transition-all shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
            BACK
          </button>
          
          {showAlternatives && (
            <div className="flex items-center gap-2 px-3 py-1 bg-[#49293e]/5 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-[#49293e] animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#49293e]">Select Variation</span>
            </div>
          )}
        </div>
      )}

      <div
        ref={parentRef}
        className="h-full overflow-y-auto scrollbar-hide px-0.5"
      >
        {rows.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-100 bg-white px-6 py-12 text-center shadow-sm">
            <p className="text-lg font-bold text-slate-300">
              {showSubCategories ? "No sub categories found." : showAlternatives ? "No variations found." : "No products found."}
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
                className="grid gap-3 xl:gap-4"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                  paddingBottom: "12px"
                }}
              >
                {rows[virtualRow.index].map((item: PosProduct | MenuSubCategory | PosAlternative) => {
                  if (showSubCategories) {
                    const sub = item as MenuSubCategory;
                    return (
                      <button
                        key={sub.subCategoryId}
                        onClick={() => onSelectSubCategory(sub.subCategoryId)}
                        className="
                          group relative flex flex-col items-center justify-center
                          rounded-xl border border-slate-200 bg-white p-4
                          transition-all duration-300 hover:shadow-lg hover:shadow-[#49293e]/5 hover:-translate-y-1
                          h-[140px]
                        "
                      >
                        <div className="w-10 h-10 rounded-lg bg-[#49293e]/5 flex items-center justify-center mb-2 group-hover:bg-[#49293e] transition-colors duration-300">
                          <svg className="w-5 h-5 text-[#49293e] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                          </svg>
                        </div>
                        <h3 className="text-sm font-bold text-[#49293e] tracking-tight text-center uppercase">{sub.subCategoryName}</h3>
                        <p className="text-[10px] font-medium text-slate-400 mt-0.5 uppercase tracking-widest">{sub.arabicName || "ITEMS"}</p>
                      </button>
                    );
                  } else if (showAlternatives) {
                    const alt = item as PosAlternative;
                    return (
                      <button
                        key={alt.altName}
                        onClick={() => onSelectAlt?.(alt)}
                        className="
                          group relative flex flex-col justify-between
                          rounded-xl border border-[#49293e]/20 bg-white p-3 text-left
                          transition-all duration-300 hover:shadow-lg hover:shadow-[#49293e]/10 hover:-translate-y-1
                          h-full w-full outline-none ring-1 ring-inset ring-transparent hover:ring-[#49293e]/30
                        "
                      >
                        <div className="w-full">
                          <h3 className="text-sm font-black text-[#49293e] leading-tight pr-1 uppercase tracking-tight">
                            {alt.altName}
                          </h3>
                          <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                            {alt.altArabic || "VARIATION"}
                          </p>
                        </div>

                        <div className="mt-2 flex items-center justify-between w-full">
                          <div className="text-base font-black text-[#49293e]">
                            {formatCurrency(alt.price)}
                          </div>

                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#49293e] text-white shadow-md shadow-[#49293e]/10 group-hover:scale-110 transition-transform">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                              <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        </div>
                      </button>
                    );
                  } else {
                    const product = item as PosProduct;
                    return (
                      <PosProductCard 
                        key={product.id} 
                        product={product} 
                        onAdd={onAdd} 
                      />
                    );
                  }
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default PosProductGrid;
