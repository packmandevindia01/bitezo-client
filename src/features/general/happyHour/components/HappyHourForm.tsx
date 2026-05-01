import { Save, Trash2, RotateCcw } from "lucide-react";
import { Button, Loader } from "../../../../components/common";
import HappyHourFilters from "./HappyHourFilters";
import HappyHourEntryRow from "./HappyHourEntryRow";
import HappyHourGrid from "./HappyHourGrid";
import type { HappyHourData, HappyHourPayload } from "../types";
// Mocking the hook for now as we'll create it next
import { useHappyHourForm } from "../hooks/useHappyHourForm";

interface Props {
  initialData?: HappyHourData | null;
  onSubmit: (payload: HappyHourPayload) => void;
  onCancel: () => void;
  submitting?: boolean;
}

const HappyHourForm = ({ initialData, onSubmit, submitting }: Props) => {
  const form = useHappyHourForm(initialData, onSubmit);

  return (
    <div className="flex flex-col gap-6 p-1">
      <div className="flex justify-center border-b-2 border-gray-100 pb-2 mb-2">
        <h1 className="text-xl font-bold text-gray-800 tracking-tight underline uppercase">
          Happy Hours
        </h1>
      </div>

      <HappyHourFilters
        promotionName={form.promotionName}
        startDate={form.startDate}
        endDate={form.endDate}
        branches={form.branches}
        categories={form.categories}
        subCategories={form.subCategories}
        selectedBranch={form.selectedBranch}
        selectedCategory={form.selectedCategory}
        selectedSubCategory={form.selectedSubCategory}
        percentage={form.percentage}
        loading={form.loading}
        loadingSubs={form.loadingSubs}
        onPromotionNameChange={form.setPromotionName}
        onStartDateChange={form.setStartDate}
        onEndDateChange={form.setEndDate}
        onBranchChange={form.setSelectedBranch}
        onCategoryChange={form.setSelectedCategory}
        onSubCategoryChange={form.setSelectedSubCategory}
        onPercentageChange={form.setPercentage}
        onLoad={form.handleLoad}
      />

      <HappyHourEntryRow
        allProducts={form.allProducts}
        altNameOptions={form.altNameOptions}
        selectedProductKey={form.selectedProductKey}
        entryUnitId={form.entryUnitId}
        entryCode={form.entryCode}
        entryPrice={form.entryPrice}
        entryDiscPercent={form.entryDiscPercent}
        entryDiscValue={form.entryDiscValue}
        entryPromoPrice={form.entryPromoPrice}
        loadingAltNames={form.loadingAltNames}
        onProductChange={(val) => void form.handleProductSelect(val)}
        onAltNameChange={form.handleAltNameSelect}
        onDiscPercentChange={form.setEntryDiscPercent}
        onDiscValueChange={form.setEntryDiscValue}
        onPromoPriceChange={form.setEntryPromoPrice}
        onAdd={form.handleAddEntry}
      />

      <HappyHourGrid
        entries={form.entries}
        onRemove={form.handleRemoveEntry}
        onUpdatePrice={form.handleUpdateEntryPrice}
      />

      <div className="flex justify-end gap-3 mt-4">
        <Button
          variant="secondary"
          onClick={form.handleDeleteAll}
          className="px-6 text-red-600 hover:bg-red-50 border-red-100"
        >
          <Trash2 size={18} /> Delete
        </Button>
        <Button
          variant="secondary"
          onClick={form.handleReset}
          className="px-6"
        >
          <RotateCcw size={18} /> Clear
        </Button>
        <Button
          onClick={form.handleSubmit}
          disabled={submitting || form.entries.length === 0}
          className="px-10 shadow-xl shadow-pos-primary/20"
        >
          {submitting ? <Loader size="sm" /> : <Save size={18} />}
          Save
        </Button>
      </div>
    </div>
  );
};

export default HappyHourForm;
