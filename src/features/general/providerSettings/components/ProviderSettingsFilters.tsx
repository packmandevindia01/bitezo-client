import { RefreshCcw } from "lucide-react";
import { Button, SelectInput } from "../../../../components/common";
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
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6 items-end">
        <SelectInput
          label="Provider"
          options={providers.map(p => ({ label: p.providerName, value: String(p.providerId) }))}
          value={selectedProvider}
          onChange={(e) => onProviderChange(e.target.value)}
          disabled={isEdit}
          placeholder="Select Provider"
        />

        <div className="flex flex-col gap-1 mb-4 w-full">
          <label className="text-xs md:text-sm font-medium text-gray-700">
            Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full px-3 md:px-4 py-2 text-sm md:text-base rounded-md border border-gray-300 bg-white outline-none focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 transition"
          />
        </div>

        <SelectInput
          label="Branch"
          options={branches.map(b => ({ label: b.branchName, value: String(b.branchId) }))}
          value={selectedBranch}
          onChange={(e) => onBranchChange(e.target.value)}
          disabled={isEdit}
          placeholder="Select Branch"
        />

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

        <div className="mb-4">
          <Button onClick={onLoad} disabled={loading} className="w-full h-10.5">
            <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
            Load
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ProviderSettingsFilters;
