import { RefreshCcw } from "lucide-react";
import { Button } from "../../../../components/common";
import type { 
  BranchMasterItem, 
  CategoryMasterItem 
} from "../../providerSettings/types";
import type { SubCategoryListItem } from "../../../inventory/subcategory/types";

interface Props {
  promotionName: string;
  startDate: string;
  endDate: string;
  branches: BranchMasterItem[];
  categories: CategoryMasterItem[];
  subCategories: SubCategoryListItem[];
  selectedBranch: string;
  selectedCategory: string;
  selectedSubCategory: string;
  percentage: string;
  loading: boolean;
  loadingSubs: boolean;
  onPromotionNameChange: (val: string) => void;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
  onBranchChange: (val: string) => void;
  onCategoryChange: (val: string) => void;
  onSubCategoryChange: (val: string) => void;
  onPercentageChange: (val: string) => void;
  onLoad: () => void;
  errors?: Record<string, string>;
}

const HappyHourFilters = ({
  promotionName,
  startDate,
  endDate,
  branches,
  categories,
  subCategories,
  selectedBranch,
  selectedCategory,
  selectedSubCategory,
  percentage,
  loading,
  loadingSubs,
  onPromotionNameChange,
  onStartDateChange,
  onEndDateChange,
  onBranchChange,
  onCategoryChange,
  onSubCategoryChange,
  onPercentageChange,
  onLoad,
  errors,
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 items-end mb-2">
        <div className="flex flex-col gap-1 w-full">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 flex justify-between">
            <span>Promotion Name</span>
            {errors?.promotionName && <span className="text-red-500 normal-case">{errors.promotionName}</span>}
          </label>
          <input
            id="hp-name"
            autoFocus
            type="text"
            value={promotionName}
            onChange={(e) => onPromotionNameChange(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "hp-start")}
            placeholder="Enter Promotion Name"
            className={`w-full px-3 py-2.5 text-xs rounded-md border bg-white outline-none focus:ring-1 transition ${errors?.promotionName ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-300 focus:border-[#49293e] focus:ring-[#49293e]/20'}`}
          />
        </div>
        <div className="flex flex-col gap-1 w-full">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Start Date & Time</label>
          <input
            id="hp-start"
            type="datetime-local"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "hp-end")}
            className="w-full px-3 py-2.5 text-xs rounded-md border border-gray-300 bg-white outline-none focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 transition"
          />
        </div>
        <div className="flex flex-col gap-1 w-full">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">End Date & Time</label>
          <input
            id="hp-end"
            type="datetime-local"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "hp-category")}
            className="w-full px-3 py-2.5 text-xs rounded-md border border-gray-300 bg-white outline-none focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 transition"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 items-end">
        <div className="flex flex-col gap-1 w-full">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Category</label>
          <select
            id="hp-category"
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "hp-subcategory")}
            className="w-full px-3 py-2.5 text-xs rounded-md border border-gray-300 bg-white outline-none focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 transition"
          >
            <option value="">Select Category</option>
            {categories.map(c => <option key={c.categoryId} value={String(c.categoryId)}>{c.categoryName}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1 w-full">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Sub Category</label>
          <select
            id="hp-subcategory"
            value={selectedSubCategory}
            onChange={(e) => onSubCategoryChange(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "hp-branch")}
            disabled={loadingSubs || !selectedCategory}
            className="w-full px-3 py-2.5 text-xs rounded-md border border-gray-300 bg-white outline-none focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 transition disabled:bg-gray-50"
          >
            <option value="">{loadingSubs ? "Loading..." : "Select Sub Category"}</option>
            {subCategories.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1 w-full">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 flex justify-between">
            <span>Branch</span>
            {errors?.selectedBranch && <span className="text-red-500 normal-case">{errors.selectedBranch}</span>}
          </label>
          <select
            id="hp-branch"
            value={selectedBranch}
            onChange={(e) => onBranchChange(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "hp-percentage")}
            className={`w-full px-3 py-2.5 text-xs rounded-md border bg-white outline-none focus:ring-1 transition ${errors?.selectedBranch ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-300 focus:border-[#49293e] focus:ring-[#49293e]/20'}`}
          >
            <option value="">Select Branch</option>
            {branches.map(b => <option key={b.branchId} value={String(b.branchId)}>{b.branchName}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2 items-end">
          <div className="flex flex-col gap-1 w-full">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 text-right">Percentage</label>
            <input
              id="hp-percentage"
              type="number"
              value={percentage}
              onChange={(e) => onPercentageChange(String(Math.abs(Number(e.target.value))))}
              onKeyDown={(e) => handleKeyDown(e, "hp-entry-product")}
              placeholder="%"
              min="0"
              style={{ textAlign: 'right' }}
              className="w-full px-3 py-2.5 text-xs rounded-md border border-gray-300 bg-white outline-none focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 transition"
            />
          </div>
          <div className="flex flex-col gap-1 w-full">
            <label className="h-[15px]"></label>
            <Button id="hp-load-btn" onClick={onLoad} disabled={loading} className="w-full h-10.5 text-[10px] font-black uppercase tracking-widest shadow-sm">
              <RefreshCcw size={12} className={loading ? "animate-spin" : ""} />
              Load
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HappyHourFilters;
