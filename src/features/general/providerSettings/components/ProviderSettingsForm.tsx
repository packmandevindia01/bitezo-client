import { Save } from "lucide-react";
import { Loader, Button } from "../../../../components/common";
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
  const form = useProviderSettingsForm(initialData, onSubmit);

  return (
    <div className="flex flex-col gap-6">
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

      <ProviderSettingsGrid
        entries={form.entries}
        onRemove={form.handleRemoveEntry}
      />

      <div className="flex justify-end gap-3 mt-4">
        <Button
          variant="secondary"
          onClick={onCancel}
          className="bg-gray-100 text-gray-600 hover:bg-gray-200"
        >
          Cancel
        </Button>
        <Button
          onClick={form.handleSubmit}
          disabled={submitting || form.entries.length === 0}
          className="px-8 shadow-xl shadow-pos-primary/20"
        >
          {submitting ? <Loader size="sm" /> : <Save size={18} />}
          {initialData ? "Update Settings" : "Save Settings"}
        </Button>
      </div>
    </div>
  );
};

export default ProviderSettingsForm;