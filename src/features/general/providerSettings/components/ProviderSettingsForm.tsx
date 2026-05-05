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
      <div className="flex justify-end gap-3 pt-3 mt-1 bg-white border-t border-slate-100">
        <Button
          variant="secondary"
          onClick={() => setShowDeleteAllConfirm(true)}
          className="h-10.5 px-6 text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 hover:bg-red-100 border-none shadow-sm"
        >
          <Trash2 size={14} /> Delete
        </Button>
        <Button
          variant="secondary"
          onClick={onCancel}
          className="h-10.5 px-6 text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 hover:bg-slate-200 border-none shadow-sm"
        >
          <X size={14} /> Cancel
        </Button>
        <Button
          variant="secondary"
          onClick={handleClearClick}
          className="h-10.5 px-6 text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 hover:bg-slate-200 border-none shadow-sm"
        >
          <RotateCcw size={14} /> Clear
        </Button>
        <Button
          onClick={form.handleSubmit}
          disabled={submitting || form.entries.length === 0}
          className="h-10.5 px-10 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-pos-primary/20"
        >
          {submitting ? <Loader size="sm" /> : <Save size={14} />}
          {initialData ? "Update Settings" : "Save Settings"}
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