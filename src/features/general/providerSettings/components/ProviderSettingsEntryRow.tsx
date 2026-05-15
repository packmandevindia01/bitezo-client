import React from "react";
import { useCurrency } from "../../../../hooks/useCurrency";
import { Button, SearchableSelect, FormInput, SelectInput } from "../../../../components/common";
import { Save } from "lucide-react";
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
        <div className="md:col-span-2 lg:col-span-4 flex flex-col gap-1">
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
        <div className="lg:col-span-2 flex flex-col gap-1">
          <div className="flex justify-between items-center px-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Price</label>
            <div className="flex items-center gap-1.5">
              <label className="text-[8px] font-black uppercase text-slate-400">Incl</label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={entryIsIncl}
                  onChange={(e) => onIsInclChange(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-7 h-3.5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-pos-primary"></div>
              </label>
            </div>
          </div>
          <FormInput
            id="ps-entry-price"
            type="number"
            value={entryPrice}
            inputClassName="text-right font-black text-pos-primary bg-pos-primary/5 border-pos-primary/20"
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
            isAction
            className="w-full bg-slate-800 hover:bg-slate-900"
            icon={<Save size={18} />}
          />
        </div>
      </div>
    </section>
  );
};

export default ProviderSettingsEntryRow;