import React, { useMemo } from "react";
import { useCurrency } from "../../../../hooks/useCurrency";
import { Button, SearchableSelect, FormInput, SelectInput, Checkbox } from "../../../../components/common";
import { Plus } from "lucide-react";
import type { ProductSearchItem, AltNameItem } from "../../providerSettings/types";

interface Props {
  allProducts: ProductSearchItem[];
  altNameOptions: AltNameItem[];
  selectedProductKey: string;
  entryProductId: number | null;
  entryUnitId: number | null;
  entryCode: string;
  entryPrice: string;
  entryDiscPercent: string;
  entryDiscValue: string;
  entryPromoPrice: string;
  entryIsIncl: boolean;
  loadingAltNames: boolean;
  onProductChange: (val: string) => void;
  onAltNameChange: (val: string, productId?: number) => void;
  onPriceChange: (val: string) => void;
  onIsInclChange: (val: boolean) => void;
  onDiscPercentChange: (val: string) => void;
  onDiscValueChange: (val: string) => void;
  onPromoPriceChange: (val: string) => void;
  onAdd: () => void;
}

const HappyHourEntryRow = ({
  allProducts,
  altNameOptions,
  selectedProductKey,
  entryProductId,
  entryUnitId,
  entryCode,
  entryPrice,
  entryDiscPercent,
  entryDiscValue,
  entryPromoPrice,
  loadingAltNames,
  onProductChange,
  onAltNameChange,
  onPriceChange,
  onIsInclChange,
  onDiscPercentChange,
  onDiscValueChange,
  onPromoPriceChange,
  entryIsIncl,
  onAdd,
}: Props) => {
  const { formatAmount } = useCurrency();

  const productOptions = useMemo(() => 
    allProducts.map((p) => ({
      label: `${p.productName}${p.altName ? ` (${p.altName})` : ""}`,
      value: `${p.productId}-${p.unitId}`,
    })),
  [allProducts]);

  const handleKeyDown = (e: React.KeyboardEvent, nextFieldId?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextFieldId) {
        document.getElementById(nextFieldId)?.focus();
      }
    }
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4 lg:grid-cols-12 items-end">
        
        {/* Product Search */}
        <div className="md:col-span-2 lg:col-span-3 flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Product</label>
          <SearchableSelect
            id="hp-entry-product"
            options={productOptions}
            value={selectedProductKey}
            onChange={onProductChange}
            placeholder="Search..."
          />
        </div>

        {/* Barcode */}
        <div className="lg:col-span-2">
          <FormInput
            id="hp-entry-barcode"
            label="Barcode"
            value={entryCode}
            readOnly
            inputClassName="bg-gray-50 font-bold text-gray-500"
            onKeyDown={(e) => handleKeyDown(e, "hp-entry-alt")}
          />
        </div>

        {/* Alt Name */}
        <div className="lg:col-span-2">
          <SelectInput
            id="hp-entry-alt"
            label="Alt Name"
            value={entryUnitId?.toString() ?? ""}
            onChange={(e) => onAltNameChange(e.target.value, entryProductId ?? undefined)}
            onKeyDown={(e) => handleKeyDown(e, "hp-entry-price")}
            disabled={!selectedProductKey || loadingAltNames}
            options={[
              { value: "", label: loadingAltNames ? "..." : "Select Unit" },
              ...altNameOptions.map(a => ({ value: String(a.unitId), label: a.altName }))
            ]}
          />
        </div>

        {/* Price */}
        <div className="lg:col-span-1 flex flex-col gap-1.5">
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
             id="hp-entry-price"
             type="number"
             value={entryPrice ?? ""}
             inputClassName="text-right font-black text-[#49293e] bg-[#49293e]/5"
             onChange={(e) => {
               const val = e.target.value;
               if (val === "" || Number(val) >= 0) {
                 onPriceChange(val);
               }
             }}
             onKeyDown={(e) => {
               if (e.key === '-' || e.key === 'e') e.preventDefault();
               handleKeyDown(e, "hp-entry-disc-per");
             }}
          />
        </div>

        <div className="lg:col-span-1">
          <FormInput
            id="hp-entry-disc-per"
            label="Disc(%)"
            type="number"
            inputClassName="text-right"
            value={entryDiscPercent ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "" || Number(val) >= 0) {
                onDiscPercentChange(val);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === '-' || e.key === 'e') e.preventDefault();
              handleKeyDown(e, "hp-entry-disc-val");
            }}
            placeholder="0"
          />
        </div>

        <div className="lg:col-span-1">
          <FormInput
            id="hp-entry-disc-val"
            label="Disc"
            type="number"
            inputClassName="text-right"
            value={entryDiscValue ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "" || Number(val) >= 0) {
                onDiscValueChange(val);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === '-' || e.key === 'e') e.preventDefault();
              handleKeyDown(e, "hp-entry-promo");
            }}
            placeholder={formatAmount(0)}
          />
        </div>

        <div className="lg:col-span-1">
          <FormInput
            id="hp-entry-promo"
            label="Promo"
            type="number"
            inputClassName="text-right font-black text-[#49293e] bg-[#49293e]/10 border-[#49293e]/30"
            value={entryPromoPrice ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "" || Number(val) >= 0) {
                onPromoPriceChange(val);
              }
            }}
            onKeyDown={(e) => { 
              if (e.key === '-' || e.key === 'e') e.preventDefault(); 
              if (e.key === 'Enter') {
                e.preventDefault();
                onAdd();
                setTimeout(() => document.getElementById("hp-entry-product")?.focus(), 0);
              }
            }}
            placeholder={formatAmount(0)}
          />
        </div>

        {/* Add Button */}
        <div className="lg:col-span-1">
          <Button 
            id="hp-entry-add-btn" 
            onClick={() => { onAdd(); setTimeout(() => document.getElementById("hp-entry-product")?.focus(), 0); }}
            className="w-full h-10.5 bg-[#49293e] hover:bg-[#3a2032]"
            icon={<Plus size={18} />}
          >
            Add
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HappyHourEntryRow;
