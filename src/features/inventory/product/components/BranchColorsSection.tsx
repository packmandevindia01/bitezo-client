import { Trash2, Plus } from "lucide-react";
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
      <div className="mb-4 flex items-center justify-end">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleAdd}
          disabled={disabled || unassignedBranches.length === 0}
          className="flex items-center gap-1.5 !py-1 text-[10px] font-bold uppercase tracking-wider"
        >
          <Plus size={14} />
          Add Color
        </Button>
      </div>

      {productColors.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-8">
          <p className="text-xs font-medium text-gray-400">No branch colors defined</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {productColors.map((pc, index) => {
            const branch = branches.find(b => b.id === pc.branchId);
            return (
              <div 
                key={index} 
                className="group relative flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-2.5 shadow-sm transition hover:border-[#49293e]/20"
              >
                <div className="flex-1 min-w-0">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-0.5 block">
                    Branch
                  </label>
                  <select
                    value={pc.branchId}
                    onChange={(e) => handleUpdate(index, { branchId: Number(e.target.value) })}
                    disabled={disabled}
                    className="w-full bg-transparent text-[11px] font-bold text-gray-900 outline-none focus:ring-0 appearance-none cursor-pointer truncate"
                  >
                    <option value={pc.branchId}>{branch?.name || "Unknown"}</option>
                    {unassignedBranches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col items-end shrink-0">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-0.5 block">
                    Color
                  </label>
                  <div className="flex items-center gap-1.5">
                    <div className="relative h-6 w-6 overflow-hidden rounded-md border border-gray-200 shadow-sm">
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
                      className="w-12 bg-transparent text-[10px] font-mono font-bold text-gray-500 outline-none uppercase"
                      maxLength={7}
                    />
                  </div>
                </div>

                <button
                  onClick={() => handleRemove(index)}
                  disabled={disabled}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-red-500 shadow-sm border border-red-50 opacity-0 transition group-hover:opacity-100 hover:bg-red-50"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
