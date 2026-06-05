import { RefreshCcw } from "lucide-react";
import { Button, FormInput, SearchableSelect } from "../../../../components/common";
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
    <section className="rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-6 items-end">
        <SearchableSelect
          id="ps-provider"
          label="Provider"
          autoFocus
          value={selectedProvider}
          onChange={onProviderChange}
          disabled={isEdit}
          placeholder="Select Provider"
          options={providers.map(p => ({ value: String(p.providerId), label: p.providerName }))}
        />

        <FormInput
          id="ps-date"
          label="Date"
          type="date"
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "ps-branch")}
        />

        <SearchableSelect
          id="ps-branch"
          label="Branch"
          value={selectedBranch}
          onChange={onBranchChange}
          disabled={isEdit}
          placeholder="Select Branch"
          options={branches.map(b => ({ value: String(b.branchId), label: b.branchName }))}
        />

        <SearchableSelect
          id="ps-category"
          label="Category"
          value={selectedCategory}
          onChange={onCategoryChange}
          placeholder="Select Category"
          options={categories.map(c => ({ value: String(c.categoryId), label: c.categoryName }))}
        />

        <SearchableSelect
          id="ps-subcategory"
          label="Sub Category"
          value={selectedSubCategory}
          onChange={onSubCategoryChange}
          disabled={loadingSubs || !selectedCategory}
          placeholder={loadingSubs ? "Loading..." : "Select Sub Category"}
          options={subCategories.map(s => ({ value: String(s.id), label: s.name }))}
        />

        <div className="flex flex-col w-full mb-1">
          <Button 
            id="ps-load-btn"
            onClick={onLoad} 
            disabled={loading} 
            isAction
            loading={loading}
            icon={<RefreshCcw size={18} className={loading ? "animate-spin" : ""} />}
          >
            Load Data
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ProviderSettingsFilters;
