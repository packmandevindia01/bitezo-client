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
  return (
    <aside className="
      no-scrollbar flex gap-2 overflow-auto border-slate-100 bg-[#fcf9fb] p-3 shrink-0
      flex-row w-full border-b lg:flex-col lg:w-[200px] xl:w-[220px] lg:h-full lg:border-r lg:p-3 xl:p-4 lg:gap-2.5 xl:gap-3
    ">
      {categories.map((category) => {
        const isActive = category.id.toString() === activeCategoryId.toString();

        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect(category.id.toString())}
            className={`
              relative flex items-center gap-3
              rounded-xl px-3 py-1.5 text-left transition-all duration-300 
              active:scale-[0.98] group shrink-0
              ${
                isActive
                  ? "bg-[#49293e] text-white shadow-lg shadow-[#49293e]/20 z-10"
                  : "bg-white text-slate-700 border border-slate-200/60 shadow-sm hover:border-[#49293e]/30"
              }
              min-w-[120px] lg:min-w-0 lg:w-full
            `}
          >
            {category.imageUrl ? (
              <img 
                src={category.imageUrl} 
                alt={category.name} 
                className="w-8 h-8 rounded-lg object-cover shrink-0" 
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-black uppercase ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"}`}>
                {category.name.substring(0, 2)}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <p className={`text-xs font-bold tracking-tight uppercase leading-tight line-clamp-2 break-words ${isActive ? "text-white" : "text-[#49293e]"}`}>
                {category.name}
              </p>
              {category.arabicName && (
                <p className={`text-[10px] font-semibold leading-tight mt-0.5 line-clamp-2 break-words ${isActive ? "text-white/80" : "text-slate-400"}`}>
                  {category.arabicName}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </aside>
  );
};

export default PosCategoryRail;
