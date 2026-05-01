import { Plus } from "lucide-react";
import { Button, FormInput, SearchableSelect, SelectInput, Checkbox } from "../../../../components/common";
import type { ProductSearchItem, AltNameItem } from "../types";

interface Props {
  allProducts: ProductSearchItem[];
  altNameOptions: AltNameItem[];
  selectedProductKey: string;
  entryUnitId: number | null;
  entryCode: string;
  entryPrice: string;
  entryIsIncl: boolean;
  loadingAltNames: boolean;
  onProductChange: (val: string) => void;
  onAltNameChange: (val: string) => void;
  onCodeChange: (val: string) => void;
  onPriceChange: (val: string) => void;
  onIsInclChange: (val: boolean) => void;
  onAdd: () => void;
}

const labelClass = "text-[10px] font-bold uppercase tracking-widest text-gray-400";

const ProviderSettingsEntryRow = ({
  allProducts, altNameOptions,
  selectedProductKey, entryUnitId,
  entryCode, entryPrice, entryIsIncl,
  loadingAltNames,
  onProductChange, onAltNameChange,
  onCodeChange, onPriceChange, onIsInclChange, onAdd,
}: Props) => (
  <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
    <div className="grid grid-cols-1 gap-4 md:grid-cols-6 items-end">

      <div className="md:col-span-2">
        <SearchableSelect
          label="Product"
          options={allProducts.map((p) => ({
            label: `${p.productName} (${p.altName})`,
            value: `${p.productId}-${p.unitId}`,
          }))}
          value={selectedProductKey}
          onChange={onProductChange}
          placeholder="Search product..."
        />
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>Code</label>
        <FormInput
          value={entryCode}
          onChange={(e) => onCodeChange(e.target.value)}
          placeholder="Barcode"
          readOnly
        />
      </div>

      <SelectInput
        label="Alt Name"
        options={altNameOptions.map(a => ({ label: a.altName, value: String(a.unitId) }))}
        value={entryUnitId?.toString() ?? ""}
        onChange={(e) => onAltNameChange(e.target.value)}
        disabled={!selectedProductKey || loadingAltNames}
        placeholder={loadingAltNames ? "Loading..." : "Alt Name"}
      />

      <div className="space-y-1.5">
        <label className={labelClass}>Price</label>
        <FormInput
          value={entryPrice}
          onChange={(e) => onPriceChange(e.target.value)}
          placeholder="0.000"
          type="number"
          step="0.001"
          min="0"
        />
      </div>

      <div className="mb-4">
        <Checkbox
          label="Tax Incl."
          checked={entryIsIncl}
          onChange={(e) => onIsInclChange(e.target.checked)}
        />
      </div>

      <Button onClick={onAdd} className="w-full h-10.5 bg-slate-800 hover:bg-slate-900">
        <Plus size={18} /> Add Item
      </Button>
    </div>
  </section>
);

export default ProviderSettingsEntryRow;