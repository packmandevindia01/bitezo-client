import { Palette, Trash2, Plus } from "lucide-react";
import type { MasterItem, ProductColorItem } from "../types";
import { Button } from "../../../../components/common";

interface BranchColorsSectionProps {
  productColors: ProductColorItem[];
  branches: MasterItem[];
  onChange: (colors: ProductColorItem[]) => void;
  disabled?: boolean;
}

export const BranchColorsSection = ({
  productColors,
  branches,
  onChange,
  disabled = false,
}: BranchColorsSectionProps) => {
  const handleAdd = () => {
    const availableBranch = branches.find(b => !productColors.some(pc => pc.branchId === b.id));
    if (!availableBranch) return;

    onChange([...productColors, { branchId: availableBranch.id, colorCode: "#49293e" }]);
  };

  const handleRemove = (index: number) => {
    const next = [...productColors];
    next.splice(index, 1);
    onChange(next);
  };

  const handleUpdate = (index: number, patch: Partial<ProductColorItem>) => {
    const next = [...productColors];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const unassignedBranches = branches.filter(b => !productColors.some(pc => pc.branchId === b.id));

  return (
    <div className="animate-in fade-in slide-in-from-left-2 duration-300">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Branch-wise Colors</h3>
          <p className="text-xs text-gray-500 mt-0.5">Define custom visual styles for this product in specific branches.</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleAdd}
          disabled={disabled || unassignedBranches.length === 0}
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          Add Branch Color
        </Button>
      </div>

      {productColors.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 py-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-gray-400 shadow-sm mb-3">
            <Palette size={24} />
          </div>
          <p className="text-sm font-medium text-gray-900">No branch colors defined</p>
          <p className="text-xs text-gray-500 mt-1">Click the button above to add a branch-specific color.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {productColors.map((pc, index) => {
            const branch = branches.find(b => b.id === pc.branchId);
            return (
              <div 
                key={index} 
                className="group relative flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-[#49293e]/20"
              >
                <div className="flex-1 min-w-0">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 block">
                    Branch
                  </label>
                  <select
                    value={pc.branchId}
                    onChange={(e) => handleUpdate(index, { branchId: Number(e.target.value) })}
                    disabled={disabled}
                    className="w-full bg-transparent text-sm font-semibold text-gray-900 outline-none focus:ring-0 appearance-none cursor-pointer"
                  >
                    <option value={pc.branchId}>{branch?.name || "Unknown Branch"}</option>
                    {unassignedBranches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col items-end">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 block">
                    Color
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative h-8 w-8 overflow-hidden rounded-lg border border-gray-200 shadow-sm">
                      <input
                        type="color"
                        value={pc.colorCode}
                        onChange={(e) => handleUpdate(index, { colorCode: e.target.value })}
                        disabled={disabled}
                        className="absolute inset-[-50%] h-[200%] w-[200%] cursor-pointer border-none bg-transparent"
                      />
                    </div>
                    <input
                      type="text"
                      value={pc.colorCode}
                      onChange={(e) => handleUpdate(index, { colorCode: e.target.value })}
                      disabled={disabled}
                      className="w-16 bg-transparent text-[10px] font-mono font-medium text-gray-500 outline-none uppercase"
                      maxLength={7}
                    />
                  </div>
                </div>

                <button
                  onClick={() => handleRemove(index)}
                  disabled={disabled}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-red-500 shadow-sm border border-red-50 opacity-0 transition group-hover:opacity-100 hover:bg-red-50"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
