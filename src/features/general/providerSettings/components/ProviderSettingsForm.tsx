import { useState } from "react";
import { Save, RotateCcw, X, Trash2 } from "lucide-react";
import { Button } from "../../../../components/common";
import ConfirmDialog from "../../../../components/common/ConfirmDialog";
import { useProviderSettingsForm } from "../hooks/useProviderSettingsForm";
import ProviderSettingsFilters from "./ProviderSettingsFilters";
import ProviderSettingsGrid from "./ProviderSettingsGrid";
import type { ProviderSettingsData, ProviderSettingsPayload } from "../types";

interface Props {
  initialData?: ProviderSettingsData | null;
  onSubmit: (payload: ProviderSettingsPayload) => void;
  onCancel: () => void;
  submitting?: boolean;
}

const ProviderSettingsForm = ({ initialData, onSubmit, onCancel, submitting }: Props) => {
  const form = useProviderSettingsForm(initialData, onSubmit, onCancel);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  const handleClearClick = () => {
    const hasData = form.entries.some((e) => e.productId > 0);
    if (hasData) {
      setShowClearConfirm(true);
    } else {
      form.handleReset();
      setTimeout(() => document.getElementById("ps-provider")?.focus(), 0);
    }
  };

  const validItemsCount = form.entries.filter((e) => e.productId > 0).length;

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden p-2">
      {/* ── Fixed Header Section (Filters Only) ── */}
      <div className="flex flex-col gap-2 flex-none">
        <ProviderSettingsFilters
          providers={form.providers}
          branches={form.branches}
          categories={form.categories}
          subCategories={form.subCategories}
          selectedProvider={form.selectedProvider}
          selectedDate={form.selectedDate}
          selectedBranch={form.selectedBranch}
          selectedCategoryIds={form.selectedCategoryIds}
          selectedSubCategory={form.selectedSubCategory}
          loading={form.loading}
          loadingSubs={form.loadingSubs}
          isEdit={!!initialData}
          onProviderChange={form.setSelectedProvider}
          onDateChange={form.setSelectedDate}
          onBranchChange={form.setSelectedBranch}
          onAddCategory={form.handleAddCategory}
          onRemoveCategory={form.handleRemoveCategory}
          onClearCategories={form.handleClearCategories}
          onSubCategoryChange={form.setSelectedSubCategory}
          onLoad={form.handleLoad}
        />
      </div>

      {/* ── Interactive Data Grid (Purchase Invoice Style) ── */}
      <div className="flex-1 overflow-hidden mt-2 flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm min-h-0">
        <ProviderSettingsGrid
          entries={form.entries}
          allProducts={form.allProducts}
          altNamesMap={form.altNamesMap}
          onProductSelect={form.handleGridProductSelect}
          onAltNameSelect={form.handleGridAltNameSelect}
          onToggleTax={form.handleGridToggleTax}
          onPriceChange={form.handleGridPriceChange}
          onRemove={form.handleRemoveEntry}
          onAddRow={form.handleAddRow}
          onLoadAltNames={form.loadAltNames}
          disabled={submitting}
        />
      </div>

      {/* ── Sticky Action Footer ── */}
      <div className="flex justify-end gap-3 pt-3 mt-2 bg-white border-t border-gray-100 flex-none">
        {initialData?.master?.transId ? (
          <Button
            variant="danger"
            onClick={() => setShowDeleteAllConfirm(true)}
            isAction
            icon={<Trash2 size={18} />}
            tabIndex={-1}
            disabled={submitting}
          >
            Delete All
          </Button>
        ) : null}
        <Button
          variant="secondary"
          onClick={onCancel}
          isAction
          icon={<X size={18} />}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          variant="secondary"
          onClick={handleClearClick}
          isAction
          icon={<RotateCcw size={18} />}
          tabIndex={-1}
          disabled={submitting}
        >
          Clear
        </Button>
        <Button
          onClick={form.handleSubmit}
          disabled={submitting || validItemsCount === 0}
          isAction
          loading={submitting}
          icon={<Save size={18} />}
        >
          {initialData?.master?.transId ? "Update" : "Save"}
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
          setTimeout(() => document.getElementById("ps-provider")?.focus(), 0);
        }}
        onCancel={() => setShowClearConfirm(false)}
      />
      <ConfirmDialog
        isOpen={showDeleteAllConfirm}
        title="Delete Settings"
        message="Are you sure you want to delete these settings? This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={() => {
          void form.handleDeleteSettings();
          setShowDeleteAllConfirm(false);
        }}
        onCancel={() => setShowDeleteAllConfirm(false)}
      />
    </div>
  );
};

export default ProviderSettingsForm;