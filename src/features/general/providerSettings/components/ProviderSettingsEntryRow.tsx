import React from "react";
import { useCurrency } from "../../../../hooks/useCurrency";
import { Button, SearchableSelect, FormInput, SelectInput, Checkbox } from "../../../../components/common";
import { Plus } from "lucide-react";
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

const ProviderSettingsEntryRow = ({
  allProducts, altNameOptions,
  selectedProductKey, entryUnitId,
  entryCode, entryPrice, entryIsIncl,
  loadingAltNames,
  onProductChange, onAltNameChange,
  onCodeChange, onPriceChange, onIsInclChange, onAdd,
}: Props) => {
  const { formatAmount } = useCurrency();
  const handleKeyDown = (e: React.KeyboardEvent, nextFieldId?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextFieldId) {
        const nextEl = document.getElementById(nextFieldId);
        if (nextEl) nextEl.focus();
      }
    }
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4 lg:grid-cols-12 items-end">
        
        {/* Product Search */}
        <div className="md:col-span-2 lg:col-span-4 flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Product</label>
          <SearchableSelect
            id="ps-entry-product"
            options={allProducts.map((p) => ({
              label: `${p.productName} (${p.altName})`,
              value: `${p.productId}-${p.unitId}`,
            }))}
            value={selectedProductKey}
            onChange={onProductChange}
            placeholder="Search product..."
          />
        </div>

        {/* Barcode */}
        <div className="lg:col-span-2">
          <FormInput
            id="ps-entry-barcode"
            label="Barcode"
            value={entryCode}
            readOnly
            inputClassName="bg-gray-50 font-bold text-gray-500"
            onChange={(e) => onCodeChange(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "ps-entry-alt")}
          />
        </div>

        {/* Alt Name */}
        <div className="lg:col-span-2">
          <SelectInput
            id="ps-entry-alt"
            label="Alt Name"
            value={entryUnitId?.toString() ?? ""}
            onChange={(e) => onAltNameChange(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "ps-entry-price")}
            disabled={!selectedProductKey || loadingAltNames}
            options={[
              { value: "", label: loadingAltNames ? "..." : "Select Unit" },
              ...altNameOptions.map(a => ({ value: String(a.unitId), label: a.altName }))
            ]}
          />
        </div>

        {/* Price with Tax Toggle */}
        <div className="lg:col-span-2 flex flex-col gap-1.5">
          <div className="flex justify-between items-center px-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Price</label>
            <div className="scale-75 origin-right">
              <Checkbox
                checked={entryIsIncl}
                onChange={(e) => onIsInclChange(e.target.checked)}
                label="Incl"
              />
            </div>
          </div>
          <FormInput
            id="ps-entry-price"
            type="number"
            value={entryPrice}
            inputClassName="text-right font-black text-[#49293e] bg-[#49293e]/5 border-[#49293e]/20"
            onChange={(e) => onPriceChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onAdd();
                setTimeout(() => document.getElementById("ps-entry-product")?.focus(), 0);
              }
            }}
            placeholder={formatAmount(0)}
          />
        </div>

        {/* Add Button */}
        <div className="lg:col-span-2">
          <Button 
            id="ps-entry-add-btn"
            onClick={() => { onAdd(); setTimeout(() => document.getElementById("ps-entry-product")?.focus(), 0); }} 
            className="w-full h-10.5 bg-[#49293e] hover:bg-[#3a2032]"
            icon={<Plus size={18} />}
          >
            Add Entry
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ProviderSettingsEntryRow;