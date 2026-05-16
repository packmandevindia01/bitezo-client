import { RefreshCcw } from "lucide-react";
import { Button, SelectInput, FormInput } from "../../../../components/common";
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
        <SelectInput
          id="ps-provider"
          label="Provider"
          autoFocus
          value={selectedProvider}
          onChange={(e) => onProviderChange(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "ps-date")}
          disabled={isEdit}
          options={[
            { value: "", label: "Select Provider" },
            ...providers.map(p => ({ value: String(p.providerId), label: p.providerName }))
          ]}
        />

        <FormInput
          id="ps-date"
          label="Date"
          type="date"
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "ps-branch")}
        />

        <SelectInput
          id="ps-branch"
          label="Branch"
          value={selectedBranch}
          onChange={(e) => onBranchChange(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "ps-category")}
          disabled={isEdit}
          options={[
            { value: "", label: "Select Branch" },
            ...branches.map(b => ({ value: String(b.branchId), label: b.branchName }))
          ]}
        />

        <SelectInput
          id="ps-category"
          label="Category"
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "ps-subcategory")}
          options={[
            { value: "", label: "Select Category" },
            ...categories.map(c => ({ value: String(c.categoryId), label: c.categoryName }))
          ]}
        />

        <SelectInput
          id="ps-subcategory"
          label="Sub Category"
          value={selectedSubCategory}
          onChange={(e) => onSubCategoryChange(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "ps-entry-product")}
          disabled={loadingSubs || !selectedCategory}
          options={[
            { value: "", label: loadingSubs ? "Loading..." : "Select Sub Category" },
            ...subCategories.map(s => ({ value: String(s.id), label: s.name }))
          ]}
        />

        <div className="flex flex-col gap-1 w-full pb-0.5">
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
