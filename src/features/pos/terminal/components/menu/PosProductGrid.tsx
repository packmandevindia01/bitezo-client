import React, { useRef, useMemo, useState, useEffect, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronRight } from "lucide-react";
import type { PosProduct, MenuSubCategory, PosAlternative } from "../../../types";
import { PosProductCard } from "./PosProductCard";
import { useCurrency } from "../../../../../hooks/useCurrency";

interface PosProductGridProps {
  products: PosProduct[];
  subCategories: MenuSubCategory[];
  alternatives?: PosAlternative[];
  activeSubCategoryId: number | null;
  onSelectSubCategory: (id: number) => void;
  onBack: () => void;
  onAdd: (productId: number) => void;
  onLongPress?: (productId: number) => void;
  onSelectAlt?: (variant: PosAlternative) => void;
  categoryName?: string;
  subCategoryName?: string;
  selectedProduct?: PosProduct | null;
}

const PosProductGrid = ({
  products,
  subCategories,
  alternatives = [],
  activeSubCategoryId,
  onSelectSubCategory,
  onAdd,
  onLongPress,
  onSelectAlt,
  categoryName,
  subCategoryName,
  selectedProduct,
}: PosProductGridProps) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const firstAltRef = useRef<HTMLButtonElement>(null);
  const { formatAmount } = useCurrency();
  const [columns, setColumns] = useState(6);

  // Stable callbacks using the ref pattern to prevent stale closures
  // without needing to wrap the heavy parent functions in useCallback
  const onAddRef = useRef(onAdd);
  const onLongPressRef = useRef(onLongPress);

  useEffect(() => {
    onAddRef.current = onAdd;
    onLongPressRef.current = onLongPress;
  });

  const stableOnAdd = useCallback((productId: number) => {
    onAddRef.current(productId);
  }, []);

  const stableOnLongPress = useCallback((productId: number) => {
    if (onLongPressRef.current) {
      onLongPressRef.current(productId);
    }
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;

    const computeColumns = (width: number) => {
      // Aim for an ideal card width of ~130px.
      // This mathematically guarantees a fluid width,
      // perfectly emulating CSS repeat(auto-fill, minmax(130px, 1fr)).
      const cols = Math.floor(width / 130);
      return Math.max(3, Math.min(cols, 8)); // Keep between 3 and 8 columns
    };

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setColumns(computeColumns(entry.contentRect.width));
      }
    });

    // Fire immediately with current width so first render is correct
    setColumns(computeColumns(scrollRef.current.getBoundingClientRect().width));
    observer.observe(scrollRef.current);
    return () => observer.disconnect();
  }, []);



  useEffect(() => {
    if (alternatives && alternatives.length > 0) {
      const timer = setTimeout(() => {
        firstAltRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [alternatives]);

  const showSubCategories = !activeSubCategoryId && subCategories.length > 0 && alternatives.length === 0;
  const showAlternatives = alternatives.length > 0;

  const breadcrumbs = useMemo(() => {
    const segments: string[] = [];
    if (categoryName) segments.push(categoryName);
    if (subCategoryName) segments.push(subCategoryName);
    if (showAlternatives && selectedProduct) segments.push(selectedProduct.name);
    return segments;
  }, [categoryName, subCategoryName, showAlternatives, selectedProduct]);
  const allItems = useMemo(() => {
    if (showAlternatives) return alternatives;
    if (showSubCategories) return [...subCategories, ...products];
    return products;
  }, [showAlternatives, showSubCategories, alternatives, subCategories, products]);

  const rows = useMemo(() => {
    const r = [];
    for (let i = 0; i < allItems.length; i += columns) {
      r.push(allItems.slice(i, i + columns));
    }
    return r;
  }, [allItems, columns]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 115, // Approx height of card + gap
    overscan: 2,
  });

  // Focus the first alternative when modal pops open
  useEffect(() => {
    if (showAlternatives && firstAltRef.current) {
      firstAltRef.current.focus();
    }
  }, [showAlternatives]);



  return (
    <section className="relative flex-1 bg-transparent overflow-hidden flex flex-col">
      {/* Breadcrumb Bar */}
      {(showAlternatives || (!showSubCategories && activeSubCategoryId)) && breadcrumbs.length > 0 && (
        <div className="w-full h-8 flex justify-end items-center px-4 shrink-0 bg-transparent border-b border-slate-200/50">
          <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-white/50 px-2 py-1 rounded-md shadow-sm">
            {breadcrumbs.map((crumb, idx) => (
              <div key={`${crumb}-${idx}`} className="flex items-center gap-1.5">
                <span className={idx === breadcrumbs.length - 1 ? "text-[#49293e] font-black" : ""}>
                  {crumb}
                </span>
                {idx < breadcrumbs.length - 1 && <ChevronRight size={10} className="text-slate-400" />}
              </div>
            ))}
          </div>
        </div>
      )}

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-scroll overflow-x-hidden p-1 lg:p-2 scroll-smooth scrollbar-wide"
      >
        {allItems.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm font-bold uppercase tracking-widest">
            {showAlternatives ? "No Alternatives" : showSubCategories ? "No Categories" : "No Products"}
          </div>
        ) : (
          <div 
            ref={parentRef}
            className="w-full relative"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => (
              <div
                key={virtualRow.index}
                className="absolute top-0 left-0 w-full"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div 
                  className="grid gap-1 lg:gap-2 px-0.5"
                  style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
                >
                  {rows[virtualRow.index].map((item: any) => {
                    if (showSubCategories && 'subCategoryId' in item) {
                      const sub = item as MenuSubCategory;
                      return (
                        <button
                          key={`sub-${sub.subCategoryId}`}
                          onClick={() => onSelectSubCategory(sub.subCategoryId)}
                          className="flex flex-col items-center justify-center gap-1 sm:gap-1 lg:gap-2 min-h-[75px] sm:min-h-[85px] md:min-h-[95px] xl:min-h-[110px] h-full rounded-xl bg-white hover:bg-slate-50 transition-all shadow-sm border border-slate-200 active:scale-95 outline-none focus:ring-2 focus:ring-[#49293e]/20 p-2"
                        >
                          <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                            {sub.imageUrl ? (
                              <img src={sub.imageUrl} alt={sub.subCategoryName} className="w-full h-full object-cover" />
                            ) : (
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 w-4 h-4 sm:w-6 sm:h-6">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                              </svg>
                            )}
                          </div>
                          <h3 className="text-[11px] sm:text-xs font-extrabold text-[#49293e] tracking-tight text-center uppercase line-clamp-2 break-words px-1 leading-snug">{sub.subCategoryName}</h3>
                          <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 mt-0 sm:mt-0.5 tracking-wide text-center line-clamp-2 break-words px-1 leading-snug">{sub.arabicName || "ITEMS"}</p>
                        </button>
                      );
                    } else if (showAlternatives) {
                      const alt = item as PosAlternative;
                      const isFirstAlt = alternatives.indexOf(alt) === 0;
                      
                      // Create a robust unique key from alternative properties
                      const uniqueAltKey = `alt-${alt.altName}-${alt.unitId}-${alt.price}`;
                      
                      return (
                        <button
                          type="button"
                          key={uniqueAltKey}
                          ref={isFirstAlt ? firstAltRef : undefined}
                          onClick={() => onSelectAlt?.(alt)}
                          className="
                            group relative flex flex-col justify-between
                            rounded-xl border border-[#49293e]/20 bg-white text-left overflow-hidden
                            transition-all duration-300 hover:shadow-lg hover:shadow-[#49293e]/5 hover:-translate-y-0.5
                            h-[75px] sm:h-[90px] md:h-[100px] xl:h-[115px] w-full outline-none focus:ring-2 focus:ring-[#49293e]/20
                          "
                        >
                          <div className="relative w-full h-[57%] overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
                            <span className="text-sm font-black text-slate-300 uppercase select-none">
                              {alt.altName.substring(0, 2)}
                            </span>
                          </div>

                          {/* Price Badge Overlay - Moved outside overflow-hidden container */}
                          {alt.price >= 0 && (
                            <div className="absolute top-1 right-1 flex flex-col items-end gap-1 select-none z-10">
                              {alt.promoPrice !== undefined && alt.promoPrice > 0 ? (
                                <>
                                  <div className="bg-red-500/90 px-1 py-0.5 rounded text-[8px] font-bold text-white shadow-sm border border-red-600 line-through">
                                    {formatAmount(alt.price)}
                                  </div>
                                  <div className="bg-[#49293e] px-1.5 py-0.5 rounded-md text-[9px] font-black text-white shadow-md border border-[#49293e]/50">
                                    {formatAmount(alt.promoPrice)}
                                  </div>
                                </>
                              ) : (
                                <div className="bg-[#49293e] px-1.5 py-0.5 rounded-md text-[9px] font-black text-white shadow-md border border-[#49293e]/50">
                                  {formatAmount(alt.price)}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="w-full flex-1 min-h-0 flex flex-col justify-center items-center px-1.5 py-1 overflow-hidden bg-white">
                            <div className="w-full flex flex-col items-center justify-center text-center">
                              <h3 className="text-[8.5px] sm:text-[10px] xl:text-[11px] font-extrabold text-[#49293e] leading-[1.15] line-clamp-2 uppercase tracking-tight break-words">
                                {alt.altName}
                              </h3>
                              {alt.altArabic && (
                                <p className="text-[7.5px] sm:text-[9px] xl:text-[10px] font-bold text-slate-500 leading-[1.15] line-clamp-1 mt-0.5 break-words">
                                  {alt.altArabic}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    } else {
                      const product = item as PosProduct;
                      return (
                        <PosProductCard 
                          key={`prod-${product.id}`} 
                          product={product} 
                          onAdd={stableOnAdd} 
                          onLongPress={stableOnLongPress}
                          price={product.hasAlternatives ? undefined : product.price}
                          hasAlts={product.hasAlternatives}
                        />
                      );
                    }
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


    </section>
  );
};

export default React.memo(PosProductGrid);
