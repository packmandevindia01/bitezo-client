import { useRef, useMemo, useState, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { PosProduct, MenuSubCategory, PosAlternative } from "../../types";
import PosProductCard from "./PosProductCard";
import { formatAmount } from "../../../../utils/formatters";
import { menuApi } from "../../services/menuApi";

// Cache to prevent duplicate API fetches for product prices/alternatives
const productDetailsCache: Record<number, { price?: number; hasAlts?: boolean }> = {};

interface PosProductGridProps {
  products: PosProduct[];
  subCategories: MenuSubCategory[];
  alternatives?: PosAlternative[];
  activeSubCategoryId: number | null;
  onSelectSubCategory: (id: number) => void;
  onBack: () => void;
  onAdd: (productId: number) => void;
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
  onBack,
  onAdd,
  onSelectAlt,
  categoryName,
  subCategoryName,
  selectedProduct,
}: PosProductGridProps) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1);
  const [productDetails, setProductDetails] = useState<Record<number, { price?: number; hasAlts?: boolean }>>(productDetailsCache);

  useEffect(() => {
    if (!parentRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (width > 1200) setColumns(8);
        else if (width > 1000) setColumns(7);
        else if (width > 820) setColumns(6);
        else if (width > 520) setColumns(5);
        else setColumns(4);
      }
    });

    observer.observe(parentRef.current);
    return () => observer.disconnect();
  }, []);

  // Background fetch of product prices and alternatives info
  useEffect(() => {
    if (!products || products.length === 0) return;

    let isMounted = true;

    const fetchDetails = async () => {
      const missing = products.filter(p => !productDetails[p.id]);
      if (missing.length === 0) return;

      const promises = missing.map(async (p) => {
        try {
          const alts = await menuApi.getAlternatives(p.id);
          if (alts && alts.length > 0) {
            return { id: p.id, hasAlts: true, price: undefined };
          } else {
            const data = await menuApi.getProductData(p.id);
            return { id: p.id, hasAlts: false, price: data.price };
          }
        } catch (e) {
          console.error(`Failed to fetch details for product ${p.id}:`, e);
          return { id: p.id, hasAlts: false, price: 0 };
        }
      });

      const results = await Promise.all(promises);
      
      if (!isMounted) return;

      setProductDetails(prev => {
        const next = { ...prev };
        results.forEach(res => {
          if (res) {
            next[res.id] = { price: res.price, hasAlts: res.hasAlts };
            // Save to module level cache
            productDetailsCache[res.id] = { price: res.price, hasAlts: res.hasAlts };
          }
        });
        return next;
      });
    };

    fetchDetails();

    return () => {
      isMounted = false;
    };
  }, [products]);

  const firstAltRef = useRef<HTMLButtonElement | null>(null);

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
    estimateSize: () => {
      if (showSubCategories) return 152;
      return 136;
    },
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
          
          {breadcrumbs.length > 0 && (
            <div className="flex items-center gap-1.5 text-[13px] font-bold text-slate-500 uppercase tracking-wider select-none">
              {breadcrumbs.map((seg, idx) => (
                <div key={seg} className="flex items-center gap-1.5">
                  {idx > 0 && <span className="text-slate-300 font-medium font-sans">&gt;</span>}
                  <span>{seg}</span>
                </div>
              ))}
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
                className="grid gap-2.5 lg:gap-3 xl:gap-4"
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
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center mb-2 shrink-0 bg-slate-50 border border-slate-100 group-hover:border-transparent transition-colors duration-300">
                          {sub.imageUrl ? (
                            <img 
                              src={sub.imageUrl} 
                              alt={sub.subCategoryName} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <svg className="w-5 h-5 text-[#49293e] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                            </svg>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-[#49293e] tracking-tight text-center uppercase line-clamp-2 break-words px-1">{sub.subCategoryName}</h3>
                        <p className="text-[10px] font-medium text-slate-400 mt-0.5 uppercase tracking-widest text-center line-clamp-2 break-words px-1">{sub.arabicName || "ITEMS"}</p>
                      </button>
                    );
                  } else if (showAlternatives) {
                    const alt = item as PosAlternative;
                    const isFirstAlt = alternatives.indexOf(alt) === 0;
                    return (
                      <button
                        key={alt.altName}
                        ref={isFirstAlt ? firstAltRef : undefined}
                        onClick={() => onSelectAlt?.(alt)}
                        className="
                          group relative flex flex-col justify-between
                          rounded-xl border border-[#49293e]/20 bg-white text-left overflow-hidden
                          transition-all duration-300 hover:shadow-lg hover:shadow-[#49293e]/5 hover:-translate-y-0.5
                          h-[135px] w-full outline-none focus:ring-2 focus:ring-[#49293e]/20
                        "
                      >
                        <div className="relative w-full h-[60px] overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
                          <span className="text-sm font-black text-slate-300 uppercase select-none">
                            {alt.altName.substring(0, 2)}
                          </span>

                          {/* Price Badge Overlay */}
                          {alt.price > 0 && (
                            <div className="absolute top-1 right-1 bg-white px-1.5 py-0.5 rounded-md text-[9px] font-black text-[#49293e] shadow-[0_2px_4px_rgba(0,0,0,0.1)] border border-slate-100/50 select-none">
                              {formatAmount(alt.price)}
                            </div>
                          )}
                        </div>

                        <div className="w-full flex-1 flex flex-col justify-between min-h-0 p-2 pt-1.5">
                          <div className="w-full">
                            <h3 className="text-[10px] font-extrabold text-[#49293e] leading-tight line-clamp-3 uppercase tracking-tight break-words">
                              {alt.altName}
                            </h3>
                            {alt.altArabic && (
                              <p className="text-[13px] font-bold text-slate-500 leading-tight line-clamp-2 mt-0.5 break-words">
                                {alt.altArabic}
                              </p>
                            )}
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
                  } else {
                    const product = item as PosProduct;
                    const details = productDetails[product.id];
                    return (
                      <PosProductCard 
                        key={product.id} 
                        product={product} 
                        onAdd={onAdd} 
                        price={details?.hasAlts ? undefined : details?.price}
                        hasAlts={details?.hasAlts}
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
