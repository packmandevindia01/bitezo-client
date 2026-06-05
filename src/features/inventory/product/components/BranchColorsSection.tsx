import { useState } from "react";
import { Search } from "lucide-react";
import type { MasterItem, ProductColorItem } from "../types";

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
  const [searchQuery, setSearchQuery] = useState("");

  const normalizeHexColor = (value?: string) => {
    return /^#[0-9a-fA-F]{6}$/.test(value || "") ? value! : "#49293e";
  };

  // Filter out the "All" branch, then filter by search query
  const validBranches = branches.filter(b => {
    const isAll = b.name?.toLowerCase() === "all" || (b as any).branchName?.toLowerCase() === "all";
    if (isAll) return false;
    
    if (!searchQuery.trim()) return true;
    
    const name = (b.name || (b as any).branchName || "").toLowerCase();
    return name.includes(searchQuery.toLowerCase().trim());
  });

  const handleUpdateColor = (branchId: number, colorCode: string) => {
    const next = [...productColors];
    const existingIndex = next.findIndex(pc => pc.branchId === branchId);
    
    if (existingIndex >= 0) {
      next[existingIndex] = { ...next[existingIndex], colorCode };
    } else {
      next.push({ branchId, colorCode });
    }
    
    onChange(next);
  };

  return (
    <div className="animate-in fade-in slide-in-from-left-2 duration-300">
      <div className="mb-4 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={14} className="text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search branches..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={disabled}
          className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-[#49293e]/50 focus:ring-1 focus:ring-[#49293e]/20 transition-all placeholder:text-gray-400 font-medium"
        />
      </div>

      {validBranches.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-8">
          <p className="text-xs font-medium text-gray-400">
            {searchQuery ? "No branches match your search" : "No branches available"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
          {validBranches.map((branch) => {
            const existingColor = productColors.find(pc => pc.branchId === branch.id);
            const colorValue = normalizeHexColor(existingColor?.colorCode);
            
            return (
              <div 
                key={branch.id} 
                className="group relative flex flex-col gap-2 rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition hover:border-[#49293e]/20"
              >
                <div className="flex-1 min-w-0 border-b border-gray-50 pb-2">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-0.5 block">
                    Branch
                  </label>
                  <p className="w-full bg-transparent text-xs font-black text-gray-900 truncate">
                    {branch.name || (branch as any).branchName || "Unknown"}
                  </p>
                </div>

                <div className="flex flex-col shrink-0 pt-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1 block">
                    Color
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative h-7 w-7 overflow-hidden rounded-lg border border-gray-200 shadow-sm shrink-0">
                      <input
                        type="color"
                        value={colorValue}
                        onChange={(e) => handleUpdateColor(branch.id, e.target.value)}
                        disabled={disabled}
                        className="absolute inset-[-50%] h-[200%] w-[200%] cursor-pointer border-none bg-transparent"
                      />
                    </div>
                    <input
                      type="text"
                      value={colorValue}
                      onChange={(e) => handleUpdateColor(branch.id, e.target.value)}
                      disabled={disabled}
                      className="flex-1 bg-gray-50 rounded-md px-2 py-1.5 text-[11px] font-mono font-bold text-gray-600 outline-none uppercase border border-gray-100 focus:border-[#49293e]/30"
                      maxLength={7}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
