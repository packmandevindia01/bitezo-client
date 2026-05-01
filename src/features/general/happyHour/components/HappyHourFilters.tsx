import { RefreshCcw } from "lucide-react";
import { Button, SelectInput, FormInput } from "../../../../components/common";
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
}: Props) => {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-3 lg:grid-cols-3 items-end mb-4">
        <FormInput
          label="Promotion Name"
          value={promotionName}
          onChange={(e) => onPromotionNameChange(e.target.value)}
          placeholder="Enter Promotion Name"
        />
        <div className="flex flex-col gap-1 mb-4 w-full">
          <label className="text-xs md:text-sm font-medium text-gray-700">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full px-3 md:px-4 py-2 text-sm md:text-base rounded-md border border-gray-300 bg-white outline-none focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 transition"
          />
        </div>
        <div className="flex flex-col gap-1 mb-4 w-full">
          <label className="text-xs md:text-sm font-medium text-gray-700">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full px-3 md:px-4 py-2 text-sm md:text-base rounded-md border border-gray-300 bg-white outline-none focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 transition"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-3 lg:grid-cols-4 items-end">
        <SelectInput
          label="Category"
          options={categories.map(c => ({ label: c.categoryName, value: String(c.categoryId) }))}
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          placeholder="Select Category"
        />

        <SelectInput
          label="Sub Category"
          options={subCategories.map(s => ({ label: s.name, value: String(s.id) }))}
          value={selectedSubCategory}
          onChange={(e) => onSubCategoryChange(e.target.value)}
          disabled={loadingSubs || !selectedCategory}
          placeholder={loadingSubs ? "Loading..." : "Select Sub Category"}
        />

        <SelectInput
          label="Branch"
          options={branches.map(b => ({ label: b.branchName, value: String(b.branchId) }))}
          value={selectedBranch}
          onChange={(e) => onBranchChange(e.target.value)}
          placeholder="Select Branch"
        />

        <div className="grid grid-cols-2 gap-4 items-end">
          <FormInput
            label="Percentage"
            type="number"
            value={percentage}
            onChange={(e) => onPercentageChange(e.target.value)}
            placeholder="%"
          />
          <div className="mb-4">
            <Button onClick={onLoad} disabled={loading} className="w-full h-10.5">
              <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
              Load
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HappyHourFilters;
