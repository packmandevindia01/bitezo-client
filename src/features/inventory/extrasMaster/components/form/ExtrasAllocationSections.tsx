import { Building2, LayoutGrid, ChevronUp } from "lucide-react";
import { Button } from "../../../../../components/common";
import type { ExtrasMasterForm as ExtrasMasterFormType } from "../../types";
import type { CategoryListItem } from "../../../category/types";

interface ExtrasAllocationSectionsProps {
  form: ExtrasMasterFormType;
  branches: { id: number; name: string }[];
  categories: CategoryListItem[];
  branchAllocOpen: boolean;
  categoryAllocOpen: boolean;
  saving: boolean;
  onToggleBranch: (branchId: number) => void;
  onToggleCategory: (categoryId: number) => void;
  onToggleBranchAlloc: () => void;
  onToggleCategoryAlloc: () => void;
}

const ExtrasAllocationSections = ({
  form,
  branches,
  categories,
  branchAllocOpen,
  categoryAllocOpen,
  saving,
  onToggleBranch,
  onToggleCategory,
  onToggleBranchAlloc,
  onToggleCategoryAlloc,
}: ExtrasAllocationSectionsProps) => {
  return (
    <div className="space-y-4">
      <div className="mt-6 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          className={`flex-1 min-w-[140px] ${categoryAllocOpen ? "bg-[#49293e] text-white" : ""}`}
          onClick={onToggleCategoryAlloc}
          disabled={saving}
        >
          <LayoutGrid size={16} />
          Category ({form.categoryIds.length})
        </Button>
        <Button
          variant="secondary"
          className={`flex-1 min-w-[140px] ${branchAllocOpen ? "bg-[#49293e] text-white" : ""}`}
          onClick={onToggleBranchAlloc}
          disabled={saving}
        >
          <Building2 size={16} />
          Branches ({form.branchIds.length})
        </Button>
      </div>

      <div className="space-y-4 pt-4">
        {categoryAllocOpen && (
          <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-gray-900">Category Allocation</span>
              <button onClick={onToggleCategoryAlloc}><ChevronUp size={16}/></button>
            </div>
            {categories.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No categories available.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
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
                ))}
              </div>
            )}
          </div>
        )}

        {branchAllocOpen && (
          <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-gray-900">Branch Allocation</span>
              <button onClick={onToggleBranchAlloc}><ChevronUp size={16}/></button>
            </div>
            {branches.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No branches available.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {branches.map((branch) => (
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
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExtrasAllocationSections;
