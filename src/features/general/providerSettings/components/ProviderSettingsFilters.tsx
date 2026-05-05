import { RefreshCcw } from "lucide-react";
import { Button } from "../../../../components/common";
import type { 
  ProviderMasterItem, 
  BranchMasterItem, 
  CategoryMasterItem 
} from "../types";
import type { SubCategoryListItem } from "../../../inventory/subcategory/types";

interface Props {
  providers: ProviderMasterItem[];
  branches: BranchMasterItem[];
  categories: CategoryMasterItem[];
  subCategories: SubCategoryListItem[];
  selectedProvider: string;
  selectedDate: string;
  selectedBranch: string;
  selectedCategory: string;
  selectedSubCategory: string;
  loading: boolean;
  loadingSubs: boolean;
  isEdit: boolean;
  onProviderChange: (val: string) => void;
  onDateChange: (val: string) => void;
  onBranchChange: (val: string) => void;
  onCategoryChange: (val: string) => void;
  onSubCategoryChange: (val: string) => void;
  onLoad: () => void;
}

const ProviderSettingsFilters = ({
  providers,
  branches,
  categories,
  subCategories,
  selectedProvider,
  selectedDate,
  selectedBranch,
  selectedCategory,
  selectedSubCategory,
  loading,
  loadingSubs,
  isEdit,
  onProviderChange,
  onDateChange,
  onBranchChange,
  onCategoryChange,
  onSubCategoryChange,
  onLoad,
}: Props) => {
  const handleKeyDown = (e: React.KeyboardEvent, nextFieldId?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextFieldId) {
        document.getElementById(nextFieldId)?.focus();
      }
    }
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6 items-end">
        
        {/* Provider */}
        <div className="flex flex-col gap-1 w-full">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Provider</label>
          <select
            id="ps-provider"
            autoFocus
            value={selectedProvider}
            onChange={(e) => onProviderChange(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "ps-date")}
            disabled={isEdit}
            className="w-full px-3 py-2.5 text-xs rounded-md border border-gray-300 bg-white outline-none focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 transition disabled:bg-gray-50"
          >
            <option value="">Select Provider</option>
            {providers.map(p => (
              <option key={p.providerId} value={String(p.providerId)}>{p.providerName}</option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div className="flex flex-col gap-1 w-full">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Date</label>
          <input
            id="ps-date"
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "ps-branch")}
            className="w-full px-3 py-2.5 text-xs rounded-md border border-gray-300 bg-white outline-none focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 transition"
          />
        </div>

        {/* Branch */}
        <div className="flex flex-col gap-1 w-full">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Branch</label>
          <select
            id="ps-branch"
            value={selectedBranch}
            onChange={(e) => onBranchChange(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "ps-category")}
            disabled={isEdit}
            className="w-full px-3 py-2.5 text-xs rounded-md border border-gray-300 bg-white outline-none focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 transition disabled:bg-gray-50"
          >
            <option value="">Select Branch</option>
            {branches.map(b => (
              <option key={b.branchId} value={String(b.branchId)}>{b.branchName}</option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div className="flex flex-col gap-1 w-full">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Category</label>
          <select
            id="ps-category"
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "ps-subcategory")}
            className="w-full px-3 py-2.5 text-xs rounded-md border border-gray-300 bg-white outline-none focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 transition"
          >
            <option value="">Select Category</option>
            {categories.map(c => (
              <option key={c.categoryId} value={String(c.categoryId)}>{c.categoryName}</option>
            ))}
          </select>
        </div>

        {/* Sub Category */}
        <div className="flex flex-col gap-1 w-full">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Sub Category</label>
          <select
            id="ps-subcategory"
            value={selectedSubCategory}
            onChange={(e) => onSubCategoryChange(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "ps-entry-product")}
            disabled={loadingSubs || !selectedCategory}
            className="w-full px-3 py-2.5 text-xs rounded-md border border-gray-300 bg-white outline-none focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 transition disabled:bg-gray-50"
          >
            <option value="">{loadingSubs ? "Loading..." : "Select Sub Category"}</option>
            {subCategories.map(s => (
              <option key={s.id} value={String(s.id)}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Load Button */}
        <div className="flex flex-col gap-1 w-full">
          <label className="h-[15px]"></label>
          <Button 
            id="ps-load-btn"
            onClick={onLoad} 
            disabled={loading} 
            className="w-full h-10.5 text-[10px] font-black uppercase tracking-widest shadow-sm"
          >
            <RefreshCcw size={12} className={loading ? "animate-spin" : ""} />
            Load
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ProviderSettingsFilters;
