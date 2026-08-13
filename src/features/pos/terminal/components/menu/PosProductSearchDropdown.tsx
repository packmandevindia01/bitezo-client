import React, { useState, useEffect, useRef } from "react";
import { Search, X, Loader2, ChevronRight, ChevronDown, Layers, Plus } from "lucide-react";
import { menuApi } from "../../../services/menuApi";
import type { PosProductSearchResult, PosAlternative } from "../../../types";
import { useCurrency } from "../../../../../hooks/useCurrency";

interface PosProductSearchDropdownProps {
  orderTypeId: number;
  onSelectProduct: (product: PosProductSearchResult) => void;
  onSelectAlternative: (product: PosProductSearchResult, alternative: PosAlternative) => void;
  className?: string;
  autoFocus?: boolean;
}

export const PosProductSearchDropdown: React.FC<PosProductSearchDropdownProps> = ({
  orderTypeId,
  onSelectProduct,
  onSelectAlternative,
  className = "",
  autoFocus = false,
}) => {
  const { formatCurrency } = useCurrency();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PosProductSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Alternatives expansion state
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null);
  const [alternativesCache, setAlternativesCache] = useState<Record<number, PosAlternative[]>>({});
  const [loadingAltsId, setLoadingAltsId] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search query
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsLoading(false);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await menuApi.searchProducts({
          productName: trimmed,
          orderTypeId: orderTypeId || 1,
        });
        setResults(data);
        setIsOpen(true);
      } catch (err) {
        console.error("Failed to search products:", err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, orderTypeId]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    setExpandedProductId(null);
    inputRef.current?.focus();
  };

  const handleSelectStandardProduct = (product: PosProductSearchResult) => {
    onSelectProduct(product);
    handleClear();
  };

  const handleToggleAlternatives = async (e: React.MouseEvent, product: PosProductSearchResult) => {
    e.stopPropagation();

    if (expandedProductId === product.productId) {
      setExpandedProductId(null);
      return;
    }

    setExpandedProductId(product.productId);

    if (!alternativesCache[product.productId]) {
      setLoadingAltsId(product.productId);
      try {
        const alts = await menuApi.getAlternatives(product.productId, orderTypeId || 1);
        setAlternativesCache((prev) => ({ ...prev, [product.productId]: alts || [] }));
      } catch (err) {
        console.error("Failed to fetch alternatives for search product:", err);
      } finally {
        setLoadingAltsId(null);
      }
    }
  };

  const handleSelectVariation = (product: PosProductSearchResult, alt: PosAlternative) => {
    onSelectAlternative(product, alt);
    handleClear();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setQuery("");
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Search Input Bar */}
      <div className="relative w-full group">
        <div className="absolute inset-y-0 left-0 flex items-center pl-2.5 md:pl-3 pointer-events-none text-slate-400 group-focus-within:text-[#f37021] transition-colors">
          <Search size={15} strokeWidth={2.5} />
        </div>

        <input
          ref={inputRef}
          type="text"
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.trim().length > 0 && results.length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search product by name..."
          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 md:py-2 pl-8 md:pl-9 pr-8 md:pr-9 text-[11px] md:text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:bg-white focus:border-[#f37021] focus:ring-2 focus:ring-[#f37021]/15 transition-all outline-none shadow-sm"
        />

        <div className="absolute inset-y-0 right-0 flex items-center pr-2.5">
          {isLoading ? (
            <Loader2 size={14} className="text-[#f37021] animate-spin" />
          ) : query ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60 transition-colors"
              title="Clear search"
            >
              <X size={13} strokeWidth={2.5} />
            </button>
          ) : null}
        </div>
      </div>

      {/* Results Dropdown Panel */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute top-full right-0 w-[300px] sm:w-[340px] md:w-[380px] mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-[0_16px_40px_rgba(73,41,62,0.22)] z-[100] max-h-[380px] overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-top-2 duration-150 divide-y divide-slate-100">
          {results.length === 0 && !isLoading ? (
            <div className="py-6 px-4 text-center">
              <p className="text-xs font-bold text-slate-500">No products found</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Try searching with a different keyword</p>
            </div>
          ) : (
            results.map((product) => {
              const isExpanded = expandedProductId === product.productId;
              const productAlts = alternativesCache[product.productId] || [];
              const isAltsLoading = loadingAltsId === product.productId;

              return (
                <div key={product.productId} className="flex flex-col">
                  {/* Product Header Row */}
                  <div
                    onClick={() => {
                      if (product.hasAlternatives) {
                        // Toggle alternatives
                        handleToggleAlternatives({ stopPropagation: () => {} } as any, product);
                      } else {
                        handleSelectStandardProduct(product);
                      }
                    }}
                    className={`flex items-center justify-between p-2.5 md:p-3 cursor-pointer transition-colors ${
                      isExpanded
                        ? "bg-[#fff7ed] border-l-4 border-l-[#f37021]"
                        : "hover:bg-slate-50/80"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-3">
                      {/* Product Thumbnail / Icon */}
                      <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/60 flex items-center justify-center shrink-0 overflow-hidden text-[#49293e] font-black text-xs">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.productName}
                            className="w-full h-full object-cover"
                            onError={(e) => ((e.target as HTMLElement).style.display = "none")}
                          />
                        ) : (
                          <span>{product.productName.substring(0, 2).toUpperCase()}</span>
                        )}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-[#49293e] truncate">
                            {product.productName}
                          </span>
                          {product.hasAlternatives && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase bg-[#ffefe5] text-[#f37021] border border-[#f37021]/20">
                              <Layers size={9} />
                              Variations
                            </span>
                          )}
                        </div>
                        {product.arabicName && (
                          <span className="text-[10px] text-slate-400 font-medium truncate" dir="rtl">
                            {product.arabicName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price and Action */}
                    <div className="flex items-center gap-2 shrink-0">
                      {!product.hasAlternatives ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-[#49293e]">
                            {formatCurrency(product.price)}
                          </span>
                          <span className="w-6 h-6 rounded-lg bg-[#49293e]/5 text-[#49293e] flex items-center justify-center hover:bg-[#49293e] hover:text-white transition-colors">
                            <Plus size={13} strokeWidth={2.5} />
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleToggleAlternatives(e, product)}
                          className="p-1 rounded-lg text-slate-400 hover:text-[#f37021] hover:bg-[#ffefe5] transition-colors flex items-center gap-1 text-[10px] font-bold"
                        >
                          <span className="text-xs font-black text-[#49293e]">
                            {product.price > 0 ? formatCurrency(product.price) : "Options"}
                          </span>
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Variations List (for products with alternatives) */}
                  {product.hasAlternatives && isExpanded && (
                    <div className="bg-slate-50/90 border-t border-slate-100 p-2 pl-6 md:pl-8 space-y-1.5 animate-in fade-in duration-100">
                      {isAltsLoading ? (
                        <div className="flex items-center justify-center py-3 gap-2 text-slate-400 text-xs font-bold">
                          <Loader2 size={13} className="animate-spin text-[#f37021]" />
                          <span>Loading variations...</span>
                        </div>
                      ) : productAlts.length === 0 ? (
                        <div className="py-2 text-center text-slate-400 text-[11px] font-medium">
                          No variations available
                        </div>
                      ) : (
                        productAlts.map((alt, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectVariation(product, alt)}
                            className="w-full flex items-center justify-between p-2 rounded-xl bg-white hover:bg-[#ffefe5]/60 border border-slate-200/70 hover:border-[#f37021]/30 transition-all text-left group shadow-2xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#f37021] shrink-0" />
                              <span className="text-xs font-bold text-slate-700 group-hover:text-[#49293e]">
                                {alt.altName}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {alt.promoPrice !== undefined && alt.promoPrice > 0 && alt.promoPrice < alt.price && (
                                <span className="text-[10px] line-through text-slate-400">
                                  {formatCurrency(alt.price)}
                                </span>
                              )}
                              <span className="text-xs font-black text-[#f37021]">
                                {formatCurrency(
                                  alt.promoPrice !== undefined && alt.promoPrice > 0
                                    ? alt.promoPrice
                                    : alt.price
                                )}
                              </span>
                              <span className="w-5 h-5 rounded-md bg-[#f37021]/10 text-[#f37021] flex items-center justify-center group-hover:bg-[#f37021] group-hover:text-white transition-colors">
                                <Plus size={11} strokeWidth={3} />
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default PosProductSearchDropdown;
