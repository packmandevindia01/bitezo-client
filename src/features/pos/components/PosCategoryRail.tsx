import type { PosCategory } from "../types";

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
      no-scrollbar flex gap-4 overflow-auto border-slate-100 bg-[#fcf9fb] p-4 shrink-0
      flex-row w-full border-b xl:flex-col xl:w-[280px] xl:h-full xl:border-r xl:p-6 xl:gap-5
    ">
      {categories.map((category) => {
        const isActive = category.id === activeCategoryId;

        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect(category.id)}
            className={`
              relative flex flex-col items-start justify-center 
              rounded-[28px] p-4 text-left transition-all duration-300 
              active:scale-[0.97] group shrink-0
              ${
                isActive
                  ? "bg-[#49293e] text-white shadow-xl shadow-[#49293e]/20 z-10"
                  : "bg-white text-slate-800 border border-slate-100 shadow-sm hover:border-[#49293e]/20"
              }
              min-w-[160px] h-[70px] xl:min-h-[85px] xl:w-full xl:px-6 xl:py-4
            `}
          >
            <p className={`text-sm xl:text-base font-bold tracking-tight mb-1 xl:mb-2 ${isActive ? "text-white" : "text-[#49293e]"}`}>
              {category.name}
            </p>
            <p className={`text-[10px] xl:text-xs leading-relaxed font-medium line-clamp-2 ${isActive ? "text-white/70" : "text-slate-400"}`}>
              {category.description || `Fresh blends and seasonal crushes`}
            </p>
          </button>
        );
      })}
    </aside>
  );
};

export default PosCategoryRail;
