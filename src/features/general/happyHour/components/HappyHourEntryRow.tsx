import { Plus } from "lucide-react";
import { Button, FormInput, SearchableSelect, SelectInput } from "../../../../components/common";
import type { ProductSearchItem, AltNameItem } from "../../providerSettings/types";

interface Props {
  allProducts: ProductSearchItem[];
  altNameOptions: AltNameItem[];
  selectedProductKey: string;
  entryUnitId: number | null;
  entryCode: string;
  entryPrice: string;
  entryDiscPercent: string;
  entryDiscValue: string;
  entryPromoPrice: string;
  loadingAltNames: boolean;
  onProductChange: (val: string) => void;
  onAltNameChange: (val: string) => void;
  onDiscPercentChange: (val: string) => void;
  onDiscValueChange: (val: string) => void;
  onPromoPriceChange: (val: string) => void;
  onAdd: () => void;
}

const labelClass = "text-[10px] font-bold uppercase tracking-widest text-gray-400";

const HappyHourEntryRow = ({
  allProducts,
  altNameOptions,
  selectedProductKey,
  entryUnitId,
  entryCode,
  entryPrice,
  entryDiscPercent,
  entryDiscValue,
  entryPromoPrice,
  loadingAltNames,
  onProductChange,
  onAltNameChange,
  onDiscPercentChange,
  onDiscValueChange,
  onPromoPriceChange,
  onAdd,
}: Props) => (
  <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4 lg:grid-cols-8 items-end">
      <div className="md:col-span-1 lg:col-span-1">
        <SearchableSelect
          label="Product"
          options={allProducts.map((p) => ({
            label: `${p.productName}`,
            value: `${p.productId}-${p.unitId}`,
          }))}
          value={selectedProductKey}
          onChange={onProductChange}
          placeholder="Search..."
        />
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>Barcode</label>
        <FormInput
          value={entryCode}
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
          placeholder="0.000"
          readOnly
        />
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>Disc(%)</label>
        <FormInput
          value={entryDiscPercent}
          onChange={(e) => onDiscPercentChange(e.target.value)}
          placeholder="0"
          type="number"
        />
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>Disc</label>
        <FormInput
          value={entryDiscValue}
          onChange={(e) => onDiscValueChange(e.target.value)}
          placeholder="0.000"
          type="number"
        />
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>Promo Price</label>
        <FormInput
          value={entryPromoPrice}
          onChange={(e) => onPromoPriceChange(e.target.value)}
          placeholder="0.000"
          type="number"
        />
      </div>

      <div className="mb-4">
        <Button onClick={onAdd} className="w-full h-10.5 bg-slate-800 hover:bg-slate-900">
          <Plus size={18} /> Add
        </Button>
      </div>
    </div>
    
    <div className="mt-4 max-w-xs">
        <Button variant="secondary" className="w-full text-xs py-1">
            Search Product
        </Button>
    </div>
  </section>
);

export default HappyHourEntryRow;
