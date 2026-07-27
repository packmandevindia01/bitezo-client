import React, { useRef } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { PosCategory } from "../../../types";

interface PosCategoryRailProps {
  categories: PosCategory[];
  activeCategoryId: string;
  onSelect: (categoryId: string) => void;
}

const PosCategoryRailComponent = ({
  categories,
  activeCategoryId,
  onSelect,
}: PosCategoryRailProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "up" | "down") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 140;
      scrollContainerRef.current.scrollBy({
        top: direction === "up" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="flex flex-row w-full border-b md:flex-col md:h-full md:w-[160px] lg:w-[180px] xl:w-[200px] md:border-b-0 md:border-r border-slate-200 bg-[#f8fafc] md:bg-white shadow-sm overflow-hidden shrink-0 z-10 relative">
      <div className="hidden md:flex justify-center w-full bg-[#f8fafc] md:bg-white py-1.5 z-20 relative border-b border-slate-100 shadow-[0_2px_6px_rgba(0,0,0,0.02)]">
        <button
          type="button"
          onClick={() => scroll("up")}
          className="flex items-center justify-center w-[85%] max-w-[120px] h-8 bg-slate-50 border border-slate-200 rounded-lg text-[#49293e] shadow-sm hover:bg-[#49293e] hover:text-white hover:border-[#49293e] hover:shadow-md transition-all duration-300 active:scale-95"
          aria-label="Scroll Up Categories"
        >
          <ChevronUp size={20} strokeWidth={3} />
        </button>
      </div>

      {/* Categories Grid Container */}
      <aside 
        ref={scrollContainerRef}
        className="
          flex gap-2 overflow-auto border-slate-100 p-3 shrink-0 scrollbar-wide flex-1
          flex-row w-full md:grid md:grid-cols-2 md:content-start md:p-1 xl:p-1.5 md:gap-1 xl:gap-1.5 md:overflow-y-auto md:overflow-x-hidden
        "
      >
        {categories.map((category) => {
          const isActive = category.id.toString() === activeCategoryId.toString();

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelect(category.id.toString())}
              className={`
                relative flex items-center gap-1.5 sm:gap-2 md:flex-col md:items-center md:p-1 md:py-1.5 md:px-0.5
                rounded-xl px-2 py-1 sm:px-3 sm:py-1.5 text-left transition-all duration-300 
                active:scale-[0.98] group shrink-0
                ${
                  isActive
                    ? "bg-gradient-to-br from-[#49293e] to-[#603551] text-white shadow-[0_6px_16px_rgba(73,41,62,0.4)] ring-2 ring-offset-2 ring-[#49293e]/50 border border-[#49293e] translate-y-[-2px] z-10"
                    : "bg-gradient-to-b from-white to-slate-50 text-[#49293e] border border-slate-200/80 shadow-sm hover:border-[#49293e]/40 hover:shadow-[0_8px_16px_rgba(73,41,62,0.12)] hover:-translate-y-[3px]"
                }
                min-w-[95px] sm:min-w-[110px] md:min-w-0 md:w-full mb-1.5
              `}
            >
              {category.imageUrl ? (
                <img 
                  src={category.imageUrl} 
                  alt={category.name} 
                  className="w-8 h-8 sm:w-10 sm:h-10 md:w-9 md:h-9 rounded-full object-cover shrink-0 transition-transform duration-300 group-hover:scale-110 shadow-sm border border-slate-100" 
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-9 md:h-9 rounded-full shrink-0 flex items-center justify-center text-[11px] md:text-[12px] font-black uppercase shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md ${isActive ? "bg-white text-[#49293e]" : "bg-white border border-slate-200 group-hover:border-[#49293e]/30 text-[#49293e]"}`}>
                  {category.name.substring(0, 2)}
                </div>
              )}
              <div className="flex flex-col min-w-0 md:items-center w-full">
                <p className={`text-[11px] sm:text-[12px] md:text-[10px] lg:text-[11px] xl:text-[12px] font-extrabold tracking-tight uppercase leading-tight line-clamp-2 break-words md:text-center ${isActive ? "text-white" : "text-[#49293e]"}`}>
                  {category.name}
                </p>
                {category.arabicName && (
                  <p className={`text-[10px] sm:text-[11px] md:text-[9.5px] xl:text-[10.5px] font-bold leading-tight mt-0.5 line-clamp-1 break-words md:text-center ${isActive ? "text-white/90" : "text-slate-500"}`}>
                    {category.arabicName}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </aside>

      <div className="hidden md:flex justify-center w-full bg-[#f8fafc] md:bg-white py-1.5 z-20 relative border-t border-slate-100 shadow-[0_-2px_6px_rgba(0,0,0,0.02)]">
        <button
          type="button"
          onClick={() => scroll("down")}
          className="flex items-center justify-center w-[85%] max-w-[120px] h-8 bg-slate-50 border border-slate-200 rounded-lg text-[#49293e] shadow-sm hover:bg-[#49293e] hover:text-white hover:border-[#49293e] hover:shadow-md transition-all duration-300 active:scale-95"
          aria-label="Scroll Down Categories"
        >
          <ChevronDown size={20} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};

export default React.memo(PosCategoryRailComponent);
