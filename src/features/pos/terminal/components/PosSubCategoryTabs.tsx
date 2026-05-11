import type { MenuSubCategory } from "../../types";

interface PosSubCategoryTabsProps {
  subCategories: MenuSubCategory[];
  activeSubCategoryId: number | null;
  onSelect: (subCategoryId: number) => void;
}

const PosSubCategoryTabs = ({
  subCategories,
  activeSubCategoryId,
  onSelect,
}: PosSubCategoryTabsProps) => {
  if (subCategories.length === 0) return null;

  return (
    <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-3 px-4 bg-[#fcf9fb]/50">
      <div className="flex items-center gap-1 shrink-0">
        <div className="w-1.5 h-1.5 rounded-full bg-[#49293e]/30" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#49293e]/50">Sub Category</span>
      </div>
      <div className="flex items-center gap-2">
        {subCategories.map((sub) => {
          const isActive = sub.subCategoryId === activeSubCategoryId;
          return (
            <button
              key={sub.subCategoryId}
              onClick={() => onSelect(sub.subCategoryId)}
              className={`
                whitespace-nowrap px-5 py-2 rounded-xl text-xs font-bold transition-all duration-300
                ${isActive 
                  ? "bg-[#49293e] text-white shadow-lg shadow-[#49293e]/20 scale-105" 
                  : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200/60 hover:border-[#49293e]/20"}
              `}
            >
              {sub.subCategoryName}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PosSubCategoryTabs;
