import { RefreshCcw, X } from "lucide-react";
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
  selectedCategoryIds: number[];
  selectedSubCategory: string;
  loading: boolean;
  loadingSubs: boolean;
  isEdit: boolean;
  onProviderChange: (val: string) => void;
  onDateChange: (val: string) => void;
  onBranchChange: (val: string) => void;
  onAddCategory: (categoryId: number) => void;
  onRemoveCategory: (categoryId: number) => void;
  onClearCategories: () => void;
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
  selectedCategoryIds,
  selectedSubCategory,
  loading,
  loadingSubs,
  isEdit,
  onProviderChange,
  onDateChange,
  onBranchChange,
  onAddCategory,
  onRemoveCategory,
  onClearCategories,
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
          value=""
          onChange={(val) => {
            if (val) onAddCategory(Number(val));
          }}
          placeholder={selectedCategoryIds.length > 0 ? "Add category..." : "Select Category"}
          options={categories
            .filter((c) => !selectedCategoryIds.includes(c.categoryId))
            .map((c) => ({ value: String(c.categoryId), label: c.categoryName }))}
        />

        <SearchableSelect
          id="ps-subcategory"
          label="Sub Category"
          value={selectedSubCategory}
          onChange={onSubCategoryChange}
          disabled={loadingSubs || selectedCategoryIds.length === 0}
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

      {selectedCategoryIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2 px-1 border-t border-gray-100 mt-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Selected Categories ({selectedCategoryIds.length}):
          </span>
          {selectedCategoryIds.map((catId) => {
            const cat = categories.find((c) => c.categoryId === catId);
            return (
              <span
                key={catId}
                className="inline-flex items-center gap-1 rounded-md bg-[#49293e]/10 px-2.5 py-1 text-xs font-semibold text-[#49293e]"
              >
                {cat?.categoryName || `Category #${catId}`}
                <button
                  type="button"
                  onClick={() => onRemoveCategory(catId)}
                  className="p-0.5 rounded-full hover:bg-[#49293e]/20 text-[#49293e] hover:text-red-500 transition-colors"
                  title="Remove category"
                >
                  <X size={12} />
                </button>
              </span>
            );
          })}
          <button
            type="button"
            onClick={onClearCategories}
            className="text-[10px] font-bold text-gray-400 hover:text-red-500 uppercase tracking-wider ml-1"
          >
            Clear All
          </button>
        </div>
      )}
    </section>
  );
};

export default ProviderSettingsFilters;
