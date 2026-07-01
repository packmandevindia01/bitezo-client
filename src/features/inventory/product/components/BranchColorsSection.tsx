import { useState } from "react";
import { Search } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import type { ProductFormData } from "../schema/productSchema";

interface BranchColorsSectionProps {
  form: UseFormReturn<ProductFormData>;
  branchOptions: { label: string; value: string }[];
}

export const BranchColorsSection = ({
  form,
  branchOptions,
}: BranchColorsSectionProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { watch, setValue } = form;
  const productColors = watch("productColors");

  const normalizeHexColor = (value?: string) => {
    return /^#[0-9a-fA-F]{6}$/.test(value || "") ? value! : "#49293e";
  };

  // Filter out the "All" branch, then filter by search query
  const validBranches = branchOptions.filter(b => {
    const isAll = b.label?.toLowerCase() === "all";
    if (isAll) return false;
    
    if (!searchQuery.trim()) return true;
    
    return b.label.toLowerCase().includes(searchQuery.toLowerCase().trim());
  });

  const handleUpdateColor = (branchId: string, colorCode: string) => {
    const next = [...productColors];
    const existingIndex = next.findIndex(pc => pc.branchId === branchId);
    
    if (existingIndex >= 0) {
      next[existingIndex] = { ...next[existingIndex], colorCode };
    } else {
      next.push({ branchId, colorCode });
    }
    
    setValue("productColors", next, { shouldValidate: true });
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
          className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-[#49293e]/50 focus:ring-1 focus:ring-[#49293e]/20 transition-all placeholder:text-gray-400 font-medium"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {validBranches.map((branch) => {
          const existingColor = productColors.find(pc => pc.branchId === branch.value);
          const colorValue = normalizeHexColor(existingColor?.colorCode);

          return (
            <div 
              key={branch.value} 
              className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-sm transition-all"
            >
              <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:ring-2 hover:ring-[#49293e]/20 transition-all">
                <input
                  type="color"
                  value={colorValue}
                  onChange={(e) => handleUpdateColor(branch.value, e.target.value)}
                  className="absolute inset-[-50%] h-[200%] w-[200%] cursor-pointer border-none bg-transparent"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider truncate">
                  {branch.label}
                </span>
                <input
                  type="text"
                  value={colorValue}
                  onChange={(e) => handleUpdateColor(branch.value, e.target.value)}
                  className="w-20 p-0 rounded-md border-none bg-transparent text-[10px] font-mono outline-none focus:ring-0 uppercase text-slate-500"
                  placeholder="#000000"
                  maxLength={7}
                />
              </div>
            </div>
          );
        })}

        {validBranches.length === 0 && (
          <div className="col-span-full py-8 text-center text-sm font-medium text-gray-500 bg-gray-50/50 rounded-xl border border-gray-100 border-dashed">
            {searchQuery ? "No branches match your search." : "No branches available."}
          </div>
        )}
      </div>
    </div>
  );
};
