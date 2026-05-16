import { useState } from "react";
import { Save, Trash2, RotateCcw, X } from "lucide-react";
import { Button } from "../../../../components/common";
import ConfirmDialog from "../../../../components/common/ConfirmDialog";
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

const HappyHourForm = ({ initialData, onSubmit, onCancel, submitting }: Props) => {
  const form = useHappyHourForm(initialData, onSubmit, onCancel);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  const handleClearClick = () => {
    if (form.entries.length > 0 || form.promotionName || form.percentage) {
      setShowClearConfirm(true);
    } else {
      form.handleReset();
      setTimeout(() => document.getElementById("hp-name")?.focus(), 0);
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* ── Fixed Header Section (Filters & Entry) ── */}
      <div className="flex flex-col gap-2 p-1">
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
          errors={form.errors}
        />

        <HappyHourEntryRow
          allProducts={form.allProducts}
          altNameOptions={form.altNameOptions}
          selectedProductKey={form.selectedProductKey}
          entryProductId={form.entryProductId}
          entryUnitId={form.entryUnitId}
          entryCode={form.entryCode}
          entryPrice={form.entryPrice}
          entryDiscPercent={form.entryDiscPercent}
          entryDiscValue={form.entryDiscValue}
          entryPromoPrice={form.entryPromoPrice}
          entryIsIncl={form.entryIsIncl}
          loadingAltNames={form.loadingAltNames}
          onProductChange={(val) => void form.handleProductSelect(val)}
          onAltNameChange={(val, pid) => void form.handleAltNameSelect(val, pid)}
          onPriceChange={form.setEntryPrice}
          onIsInclChange={form.setEntryIsIncl}
          onDiscPercentChange={form.setEntryDiscPercent}
          onDiscValueChange={form.setEntryDiscValue}
          onPromoPriceChange={form.setEntryPromoPrice}
          onAdd={form.handleAddEntry}
        />
      </div>

      {/* ── Scrollable Table Section ── */}
      <div className="flex-1 overflow-y-auto mt-2 pr-1">
        <HappyHourGrid
          entries={form.entries}
          focusedEntryKey={form.focusedEntryKey}
          onRemove={form.handleRemoveEntry}
          onUpdatePrice={form.handleUpdateEntryPrice}
          onEdit={form.handleEditEntry}
        />
      </div>

      {/* ── Sticky Action Footer ── */}
      <div className="flex justify-end gap-3 pt-4 mt-2 bg-white border-t border-gray-100">
        <Button
          variant="secondary"
          onClick={onCancel}
          isAction
          icon={<X size={18} />}
        >
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={() => setShowDeleteAllConfirm(true)}
          isAction
          icon={<Trash2 size={18} />}
          tabIndex={-1}
        >
          Delete All
        </Button>
        <Button
          variant="secondary"
          onClick={handleClearClick}
          isAction
          icon={<RotateCcw size={18} />}
          tabIndex={-1}
        >
          Clear
        </Button>
        <Button
          onClick={form.handleSubmit}
          disabled={submitting || form.entries.length === 0}
          isAction
          loading={submitting}
          icon={<Save size={18} />}
        >
          Save
        </Button>
      </div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Clear Form"
        message="Are you sure you want to clear the form? All unsaved data will be lost."
        confirmLabel="Clear"
        onConfirm={() => {
          form.handleReset();
          setShowClearConfirm(false);
          setTimeout(() => document.getElementById("hp-name")?.focus(), 0);
        }}
        onCancel={() => setShowClearConfirm(false)}
      />
      <ConfirmDialog
        isOpen={showDeleteAllConfirm}
        title="Delete Promotion"
        message="Are you sure you want to delete this promotion? This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={() => {
          void form.handleDeletePromotion();
          setShowDeleteAllConfirm(false);
        }}
        onCancel={() => setShowDeleteAllConfirm(false)}
      />
    </div>
  );
};

export default HappyHourForm;
