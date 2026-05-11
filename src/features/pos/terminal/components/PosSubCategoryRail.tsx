import type { MenuSubCategory } from "../../types";

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
      xl:flex-col xl:w-[220px] xl:h-full xl:border-r xl:p-4 xl:gap-4 xl:bg-slate-50/30
    ">
      <div className="hidden xl:block mb-2 px-2">
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
              min-w-[130px] xl:w-full
            `}
          >
            <p className="text-xs xl:text-sm font-bold tracking-tight">
              {sub.subCategoryName}
            </p>
            <p className={`text-[9px] mt-0.5 font-medium ${isActive ? "text-white/60" : "text-slate-400"}`}>
              {sub.arabicName || "View Items"}
            </p>
          </button>
        );
      })}
    </div>
  );
};

export default PosSubCategoryRail;
