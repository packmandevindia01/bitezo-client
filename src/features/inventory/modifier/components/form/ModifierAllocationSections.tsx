import { ChevronDown, ChevronUp } from "lucide-react";
import type { ModifierForm } from "../../types";
import type { CategoryListItem } from "../../../category/types";

interface ModifierAllocationSectionsProps {
  form: ModifierForm;
  branches: { id: number; name: string }[];
  categories: CategoryListItem[];
  branchAllocOpen: boolean;
  categoryAllocOpen: boolean;
  onToggleBranch: (id: number) => void;
  onToggleCategory: (id: number) => void;
  onToggleBranchAlloc: () => void;
  onToggleCategoryAlloc: () => void;
}

const ModifierAllocationSections = ({
  form,
  branches,
  categories,
  branchAllocOpen,
  categoryAllocOpen,
  onToggleBranch,
  onToggleCategory,
  onToggleBranchAlloc,
  onToggleCategoryAlloc,
}: ModifierAllocationSectionsProps) => {
  return (
    <div className="space-y-6">
      {/* Category Allocation Section */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
        <button
          type="button"
          onClick={onToggleCategoryAlloc}
          className="flex w-full items-center justify-between"
        >
          <div className="flex flex-col items-start px-2">
            <span className="text-sm font-bold text-gray-900">Category Allocation</span>
            <span className="text-[10px] text-gray-500">
              {form.categoryIds.length} categories selected
            </span>
          </div>
          {categoryAllocOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {categoryAllocOpen && (
          <div className="mt-4 flex flex-wrap gap-2 px-2">
            {categories.length === 0 ? (
              <p className="py-2 text-xs text-gray-400">No categories available.</p>
            ) : (
              categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onToggleCategory(cat.id)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                    form.categoryIds.includes(cat.id)
                      ? "bg-[#49293e] text-white shadow-md shadow-[#49293e]/20"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-[#49293e]/40"
                  }`}
                >
                  {cat.name}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Branch Allocation Section */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
        <button
          type="button"
          onClick={onToggleBranchAlloc}
          className="flex w-full items-center justify-between"
        >
          <div className="flex flex-col items-start px-2">
            <span className="text-sm font-bold text-gray-900">Branch Allocation</span>
            <span className="text-[10px] text-gray-500">
              {form.branchIds.length} branches selected
            </span>
          </div>
          {branchAllocOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {branchAllocOpen && (
          <div className="mt-4 flex flex-wrap gap-2 px-2">
            {branches.length === 0 ? (
              <p className="py-2 text-xs text-gray-400">No branches available.</p>
            ) : (
              branches.map((branch) => (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => onToggleBranch(branch.id)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                    form.branchIds.includes(branch.id)
                      ? "bg-[#49293e] text-white shadow-md shadow-[#49293e]/20"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-[#49293e]/40"
                  }`}
                >
                  {branch.name}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModifierAllocationSections;
