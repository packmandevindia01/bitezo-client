import React from "react";
import { useCurrency } from "../../../../hooks/useCurrency";
import { Button, SearchableSelect } from "../../../../components/common";
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

const labelClass = "text-[10px] font-bold uppercase tracking-widest text-slate-600";

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
        document.getElementById(nextFieldId)?.focus();
      }
    }
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4 lg:grid-cols-12 items-end">
        
        {/* Product Search */}
        <div className="md:col-span-2 lg:col-span-4 flex flex-col gap-1.5">
          <label className={labelClass}>Product</label>
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
        <div className="flex flex-col gap-1.5 lg:col-span-2">
          <label className={labelClass}>Barcode</label>
          <input
            id="ps-entry-barcode"
            value={entryCode}
            onChange={(e) => onCodeChange(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "ps-entry-alt")}
            placeholder="Barcode"
            className="w-full h-10.5 px-3 text-xs font-bold text-gray-400 bg-gray-50 rounded-lg border border-gray-200 outline-none transition"
          />
        </div>

        {/* Alt Name */}
        <div className="flex flex-col gap-1.5 lg:col-span-2">
          <label className={labelClass}>Alt Name</label>
          <select
            id="ps-entry-alt"
            value={entryUnitId?.toString() ?? ""}
            onChange={(e) => onAltNameChange(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "ps-entry-price")}
            disabled={!selectedProductKey || loadingAltNames}
            className="w-full h-10.5 px-3 text-xs rounded-lg border border-gray-300 bg-white outline-none focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 transition disabled:bg-gray-50"
          >
            <option value="">{loadingAltNames ? "..." : "Alt Name"}</option>
            {altNameOptions.map(a => <option key={`${a.unitId}-${a.altName}`} value={String(a.unitId)}>{a.altName}</option>)}
          </select>
        </div>

        {/* Price with Tax Toggle */}
        <div className="flex flex-col gap-1.5 lg:col-span-2">
          <div className="flex justify-end items-center gap-2">
            <label className={`${labelClass} text-right`}>Price</label>
            <div className="flex items-center gap-1">
              <label className="text-[8px] font-black uppercase text-slate-400">Incl</label>
              <input
                type="checkbox"
                checked={entryIsIncl}
                onChange={(e) => onIsInclChange(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-[#49293e] focus:ring-[#49293e]/20 transition cursor-pointer"
              />
            </div>
          </div>
          <input
            id="ps-entry-price"
            type="number"
            value={entryPrice}
            style={{ textAlign: 'right' }}
            onChange={(e) => onPriceChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onAdd();
                setTimeout(() => document.getElementById("ps-entry-product")?.focus(), 0);
              }
            }}
            placeholder={formatAmount(0)}
            step="0.001"
            min="0"
            className="w-full h-10.5 px-3 text-xs font-black text-[#49293e] bg-[#49293e]/5 rounded-lg border border-[#49293e]/10 outline-none focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 transition"
          />
        </div>

        {/* Add Button */}
        <div className="flex flex-col gap-1.5 lg:col-span-2">
          <label className="h-[15px]"></label>
          <Button 
            id="ps-entry-add-btn"
            onClick={() => { onAdd(); setTimeout(() => document.getElementById("ps-entry-product")?.focus(), 0); }} 
            className="w-full h-10.5 text-[10px] font-black uppercase tracking-widest bg-slate-800 hover:bg-slate-900 shadow-sm"
          >
            Add
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ProviderSettingsEntryRow;