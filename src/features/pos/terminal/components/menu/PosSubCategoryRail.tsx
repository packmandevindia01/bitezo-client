import type { MenuSubCategory } from "../../../types";

interface PosSubCategoryRailProps {
  subCategories: MenuSubCategory[];
  activeSubCategoryId: number | null;
  onSelect: (subCategoryId: number) => void;
}

const PosSubCategoryRail = ({
  subCategories,
  activeSubCategoryId,
  onSelect,
}: PosSubCategoryRailProps) => {
  if (subCategories.length === 0) return null;

  return (
    <div className="
      no-scrollbar flex flex-row w-full gap-3 overflow-auto border-b border-slate-100 bg-[#fcf9fb] p-3 shrink-0
      lg:flex-col lg:w-[150px] xl:w-[180px] lg:h-full lg:border-r lg:p-3 xl:p-4 lg:gap-3 xl:gap-4 lg:bg-slate-50/30
    ">
      <div className="hidden lg:block mb-2 px-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Sub Category</p>
      </div>
      
      {subCategories.map((sub) => {
        const isActive = sub.subCategoryId === activeSubCategoryId;
        return (
          <button
            key={sub.subCategoryId}
            type="button"
            onClick={() => onSelect(sub.subCategoryId)}
            className={`
              relative flex flex-col items-start justify-center 
              rounded-2xl px-4 py-3 text-left transition-all duration-300 
              active:scale-[0.95] shrink-0
              ${
                isActive
                  ? "bg-[#49293e] text-white shadow-lg z-10"
                  : "bg-white text-slate-700 border border-slate-200/60 shadow-sm hover:border-[#49293e]/30"
              }
              min-w-[110px] lg:min-w-0 lg:w-full
            `}
          >
            <p className="text-xs font-bold tracking-tight line-clamp-2 break-words leading-tight">
              {sub.subCategoryName}
            </p>
            <p className={`text-[9px] mt-0.5 font-medium ${isActive ? "text-white/60" : "text-slate-400"} line-clamp-2 break-words leading-tight`}>
              {sub.arabicName || "View Items"}
            </p>
          </button>
        );
      })}
    </div>
  );
};

export default PosSubCategoryRail;
