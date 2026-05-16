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
    <section className="rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 items-end mb-3">
        <FormInput
          id="hp-name"
          label="Promotion Name"
          autoFocus
          value={promotionName}
          error={errors?.promotionName}
          onChange={(e) => onPromotionNameChange(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "hp-start")}
          placeholder="Promotion Name"
        />
        <FormInput
          id="hp-start"
          label="Start Date & Time"
          type="datetime-local"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "hp-end")}
        />
        <FormInput
          id="hp-end"
          label="End Date & Time"
          type="datetime-local"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "hp-category")}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4 items-end">
        <SelectInput
          id="hp-category"
          label="Category"
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "hp-subcategory")}
          options={[
            { value: "", label: "Select Category" },
            ...categories.map(c => ({ value: String(c.categoryId), label: c.categoryName }))
          ]}
        />

        <SelectInput
          id="hp-subcategory"
          label="Sub Category"
          value={selectedSubCategory}
          onChange={(e) => onSubCategoryChange(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "hp-branch")}
          disabled={loadingSubs || !selectedCategory}
          options={[
            { value: "", label: loadingSubs ? "Loading..." : "Select Sub Category" },
            ...subCategories.map(s => ({ value: String(s.id), label: s.name }))
          ]}
        />

        <SelectInput
          id="hp-branch"
          label="Branch"
          value={selectedBranch}
          error={errors?.selectedBranch}
          onChange={(e) => onBranchChange(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "hp-percentage")}
          options={[
            { value: "", label: "Select Branch" },
            ...branches.map(b => ({ value: String(b.branchId), label: b.branchName }))
          ]}
        />

        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <FormInput
            id="hp-percentage"
            label="Percentage (%)"
            type="number"
            inputClassName="text-right"
            value={percentage}
            onChange={(e) => onPercentageChange(String(Math.abs(Number(e.target.value))))}
            onKeyDown={(e) => handleKeyDown(e, "hp-entry-product")}
            placeholder="%"
          />
          <div className="pb-0.5">
            <Button 
              id="hp-load-btn" 
              onClick={onLoad} 
              disabled={loading} 
              isAction
              loading={loading}
              icon={<RefreshCcw size={18} className={loading ? "animate-spin" : ""} />}
            >
              Load
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HappyHourFilters;
