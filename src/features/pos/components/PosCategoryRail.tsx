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
    <aside className="grid gap-3 rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-2 xl:grid-cols-1">
      {categories.map((category) => {
        const isActive = category.id === activeCategoryId;

        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect(category.id)}
            className={`group rounded-3xl border px-4 py-4 text-left transition ${
              isActive
                ? "border-[#49293e] bg-[#49293e] text-white shadow-[0_22px_50px_-26px_rgba(73,41,62,0.85)]"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:border-[#49293e]/25 hover:bg-white"
            }`}
          >
            <p className="text-sm font-semibold tracking-wide">{category.name}</p>
            <p
              className={`mt-2 text-xs leading-5 ${
                isActive ? "text-white/80" : "text-slate-500 group-hover:text-slate-600"
              }`}
            >
              {category.description}
            </p>
          </button>
        );
      })}
    </aside>
  );
};

export default PosCategoryRail;
