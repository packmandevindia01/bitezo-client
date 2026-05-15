import { useState } from "react";
import { Save, RotateCcw, X, Trash2 } from "lucide-react";
import { Loader, Button } from "../../../../components/common";
import ConfirmDialog from "../../../../components/common/ConfirmDialog";
import { useProviderSettingsForm } from "../hooks/useProviderSettingsForm";
import ProviderSettingsFilters from "./ProviderSettingsFilters";
import ProviderSettingsEntryRow from "./ProviderSettingsEntryRow";
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
    if (form.entries.length > 0) {
      setShowClearConfirm(true);
    } else {
      form.handleReset();
      setTimeout(() => document.getElementById("ps-provider")?.focus(), 0);
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* ── Fixed Header Section (Filters & Entry) ── */}
      <div className="flex flex-col gap-2 p-1">
        <ProviderSettingsFilters
          providers={form.providers}
          branches={form.branches}
          categories={form.categories}
          subCategories={form.subCategories}
          selectedProvider={form.selectedProvider}
          selectedDate={form.selectedDate}
          selectedBranch={form.selectedBranch}
          selectedCategory={form.selectedCategory}
          selectedSubCategory={form.selectedSubCategory}
          loading={form.loading}
          loadingSubs={form.loadingSubs}
          isEdit={!!initialData}
          onProviderChange={form.setSelectedProvider}
          onDateChange={form.setSelectedDate}
          onBranchChange={form.setSelectedBranch}
          onCategoryChange={form.setSelectedCategory}
          onSubCategoryChange={form.setSelectedSubCategory}
          onLoad={form.handleLoad}
        />

        <ProviderSettingsEntryRow
          allProducts={form.allProducts}
          altNameOptions={form.altNameOptions}
          selectedProductKey={form.selectedProductKey}
          entryUnitId={form.entryUnitId}
          entryCode={form.entryCode}
          entryPrice={form.entryPrice}
          entryIsIncl={form.entryIsIncl}
          loadingAltNames={form.loadingAltNames}
          onProductChange={(val) => void form.handleProductSelect(val)}
          onAltNameChange={form.handleAltNameSelect}
          onCodeChange={form.setEntryCode}
          onPriceChange={form.setEntryPrice}
          onIsInclChange={form.setEntryIsIncl}
          onAdd={form.handleAddEntry}
        />
      </div>

      {/* ── Scrollable Table Section ── */}
      <div className="flex-1 overflow-y-auto mt-2 pr-1">
        <ProviderSettingsGrid
          entries={form.entries}
          onRemove={form.handleRemoveEntry}
          onEdit={form.handleEditEntry}
        />
      </div>

      {/* ── Sticky Action Footer ── */}
      <div className="flex justify-end gap-2 pt-3 mt-1 bg-white border-t border-slate-100">
        <Button
          variant="danger"
          onClick={() => setShowDeleteAllConfirm(true)}
          isAction
          icon={<Trash2 size={18} />}
          tabIndex={-1}
        />
        <Button
          variant="secondary"
          onClick={onCancel}
          isAction
          icon={<X size={18} />}
        />
        <Button
          variant="secondary"
          onClick={handleClearClick}
          isAction
          icon={<RotateCcw size={18} />}
          tabIndex={-1}
        />
        <Button
          onClick={form.handleSubmit}
          disabled={submitting || form.entries.length === 0}
          isAction
          loading={submitting}
          icon={<Save size={18} />}
        />
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