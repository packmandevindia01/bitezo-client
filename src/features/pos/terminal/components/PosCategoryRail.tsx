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
      flex-row w-full border-b xl:flex-col xl:w-[220px] xl:h-full xl:border-r xl:p-4 xl:gap-3
    ">
      {categories.map((category) => {
        const isActive = category.id.toString() === activeCategoryId.toString();

        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect(category.id.toString())}
            className={`
              relative flex flex-col items-center justify-center 
              rounded-xl px-4 py-2 text-center transition-all duration-300 
              active:scale-[0.98] group shrink-0
              ${
                isActive
                  ? "bg-[#49293e] text-white shadow-lg shadow-[#49293e]/20 z-10"
                  : "bg-white text-slate-700 border border-slate-200/60 shadow-sm hover:border-[#49293e]/30"
              }
              min-w-[120px] h-[45px] xl:min-h-[48px] xl:w-full
            `}
          >
            <p className={`text-xs xl:text-sm font-bold tracking-tight uppercase ${isActive ? "text-white" : "text-[#49293e]"}`}>
              {category.name}
            </p>
          </button>
        );
      })}
    </aside>
  );
};

export default PosCategoryRail;
