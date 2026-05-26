import { useRef } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { PosCategory } from "../../types";

interface PosCategoryRailProps {
  categories: PosCategory[];
  activeCategoryId: string;
  onSelect: (categoryId: string) => void;
}

const PosCategoryRail = ({
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
    <div className="flex flex-row w-full border-b md:flex-col md:h-full md:w-[160px] lg:w-[180px] xl:w-[200px] md:border-r md:border-b-0 bg-[#fcf9fb] overflow-hidden shrink-0">
      {/* Scroll Up Button - Desktop only */}
      <button
        type="button"
        onClick={() => scroll("up")}
        className="hidden md:flex items-center justify-center w-full h-8 bg-white hover:bg-slate-50 border-b border-slate-100 text-[#49293e] hover:text-[#3a2132] active:scale-95 transition-all duration-200 shrink-0"
        aria-label="Scroll Up Categories"
      >
        <ChevronUp size={18} strokeWidth={2.5} />
      </button>

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
                relative flex items-center gap-2 md:flex-col md:items-center md:p-1 md:py-1.5 md:px-0.5
                rounded-xl px-3 py-1.5 text-left transition-all duration-300 
                active:scale-[0.98] group shrink-0
                ${
                  isActive
                    ? "bg-[#49293e] text-white shadow-lg shadow-[#49293e]/20 z-10"
                    : "bg-white text-slate-700 border border-slate-200/60 shadow-sm hover:border-[#49293e]/30"
                }
                min-w-[120px] md:min-w-0 md:w-full
              `}
            >
              {category.imageUrl ? (
                <img 
                  src={category.imageUrl} 
                  alt={category.name} 
                  className="w-8 h-8 md:w-7 md:h-7 rounded-lg object-cover shrink-0" 
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className={`w-8 h-8 md:w-7 md:h-7 rounded-lg shrink-0 flex items-center justify-center text-xs md:text-[10px] font-black uppercase ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"}`}>
                  {category.name.substring(0, 2)}
                </div>
              )}
              <div className="flex flex-col min-w-0 md:items-center w-full">
                <p className={`text-xs md:text-[8px] xl:text-[9.5px] font-black tracking-tight uppercase leading-tight line-clamp-2 break-words md:text-center ${isActive ? "text-white" : "text-[#49293e]"}`}>
                  {category.name}
                </p>
                {category.arabicName && (
                  <p className={`text-[10px] md:text-[7.5px] xl:text-[8.5px] font-bold leading-tight mt-0.5 line-clamp-1 break-words md:text-center ${isActive ? "text-white/80" : "text-slate-400"}`}>
                    {category.arabicName}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </aside>

      {/* Scroll Down Button - Desktop only */}
      <button
        type="button"
        onClick={() => scroll("down")}
        className="hidden md:flex items-center justify-center w-full h-8 bg-white hover:bg-slate-50 border-t border-slate-100 text-[#49293e] hover:text-[#3a2132] active:scale-95 transition-all duration-200 shrink-0"
        aria-label="Scroll Down Categories"
      >
        <ChevronDown size={18} strokeWidth={2.5} />
      </button>
    </div>
  );
};

export default PosCategoryRail;
