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
    <div className="flex flex-col h-full w-full border-r border-slate-200 bg-white shadow-sm overflow-hidden shrink-0 z-10 relative">
      <div className="flex justify-center w-full bg-white py-1 md:py-1.5 z-20 relative border-b border-slate-100 shadow-[0_2px_6px_rgba(0,0,0,0.02)]">
        <button
          type="button"
          onClick={() => scroll("up")}
          className="flex items-center justify-center w-[85%] max-w-[120px] h-6 md:h-8 bg-slate-50 border border-slate-200 rounded-lg text-[#49293e] shadow-sm hover:bg-[#49293e] hover:text-white hover:border-[#49293e] hover:shadow-md transition-all duration-300 active:scale-95"
          aria-label="Scroll Up Categories"
        >
          <ChevronUp size={20} strokeWidth={3} />
        </button>
      </div>

      <aside 
        ref={scrollContainerRef}
        className="flex-1 w-full grid grid-cols-2 content-start p-1 gap-1 lg:p-2 lg:gap-2 overflow-y-auto overflow-x-hidden scroll-smooth"
      >
        {categories.map((category) => {
          const isActive = category.id.toString() === activeCategoryId.toString();

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelect(category.id.toString())}
              className={`
                relative flex flex-col justify-between items-center overflow-hidden
                rounded-xl text-center transition-all duration-300 
                active:scale-[0.98] group shrink-0
                ${
                  isActive
                    ? "bg-gradient-to-br from-[#49293e] to-[#603551] shadow-[0_4px_12px_rgba(73,41,62,0.4)] ring-2 ring-offset-2 ring-[#49293e]/50 border-transparent translate-y-[-2px] z-10"
                    : "bg-white border border-slate-200/80 shadow-sm hover:border-[#49293e]/40 hover:shadow-[0_8px_16px_rgba(73,41,62,0.12)] hover:-translate-y-[2px]"
                }
                w-full min-w-0 h-[50px] md:h-[80px] lg:h-[90px] xl:h-[90px] mb-0
              `}
            >
              <div className={`relative w-full h-[55%] shrink-0 overflow-hidden rounded-t-xl border-b flex items-center justify-center ${isActive ? 'bg-white/90 border-white/20' : 'bg-slate-50 border-slate-100/50'}`}>
                {category.imageUrl ? (
                  <img 
                    src={category.imageUrl} 
                    alt={category.name} 
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span className={`text-[12px] md:text-[14px] font-black uppercase select-none ${isActive ? 'text-[#49293e]' : 'text-slate-300'}`}>
                    {category.name.substring(0, 2)}
                  </span>
                )}
              </div>
              <div className="flex flex-col flex-1 min-h-0 min-w-0 items-center justify-center w-full px-1 py-0.5 overflow-hidden">
                <p className={`text-[9px] md:text-[10px] xl:text-[11px] font-extrabold tracking-tight uppercase leading-[1.15] line-clamp-2 break-words text-center ${isActive ? "text-white" : "text-[#49293e]"}`}>
                  {category.name}
                </p>
                {category.arabicName && (
                  <p className={`text-[8px] md:text-[9px] xl:text-[10px] font-bold leading-[1.15] mt-0.5 line-clamp-1 break-words text-center ${isActive ? "text-white/90" : "text-slate-500"}`}>
                    {category.arabicName}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </aside>

      <div className="flex justify-center w-full bg-white py-1 md:py-1.5 z-20 relative border-t border-slate-100 shadow-[0_-2px_6px_rgba(0,0,0,0.02)]">
        <button
          type="button"
          onClick={() => scroll("down")}
          className="flex items-center justify-center w-[85%] max-w-[120px] h-6 md:h-8 bg-slate-50 border border-slate-200 rounded-lg text-[#49293e] shadow-sm hover:bg-[#49293e] hover:text-white hover:border-[#49293e] hover:shadow-md transition-all duration-300 active:scale-95"
          aria-label="Scroll Down Categories"
        >
          <ChevronDown size={20} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};

export default React.memo(PosCategoryRailComponent);
