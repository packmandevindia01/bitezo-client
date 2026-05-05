import React, { useMemo, useRef } from "react";
import { useCurrency } from "../../../../hooks/useCurrency";
import { Button, SearchableSelect } from "../../../../components/common";
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

const labelClass = "text-[11px] font-bold uppercase tracking-widest text-slate-600";

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
  const discPercentRef = useRef<HTMLInputElement>(null);
  const discValueRef = useRef<HTMLInputElement>(null);
  const promoPriceRef = useRef<HTMLInputElement>(null);

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
    <section className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4 lg:grid-cols-12 items-end">
        
        {/* Product Search */}
        <div className="md:col-span-2 lg:col-span-3 flex flex-col gap-1.5">
          <label className={labelClass}>Product</label>
          <SearchableSelect
            id="hp-entry-product"
            options={productOptions}
            value={selectedProductKey}
            onChange={onProductChange}
            placeholder="Search..."
          />
        </div>

        {/* Barcode */}
        <div className="flex flex-col gap-1.5 lg:col-span-2">
          <label className={labelClass}>Barcode</label>
          <input
            id="hp-entry-barcode"
            value={entryCode}
            readOnly
            onKeyDown={(e) => handleKeyDown(e, "hp-entry-alt")}
            className="w-full h-10.5 px-3 text-sm font-bold text-gray-400 bg-gray-50 rounded-lg border border-gray-200 outline-none transition"
          />
        </div>

        {/* Alt Name */}
        <div className="flex flex-col gap-1.5 lg:col-span-2">
          <label className={labelClass}>Alt Name</label>
          <select
            id="hp-entry-alt"
            value={entryUnitId?.toString() ?? ""}
            onChange={(e) => onAltNameChange(e.target.value, entryProductId ?? undefined)}
            onKeyDown={(e) => handleKeyDown(e, "hp-entry-price")}
            disabled={!selectedProductKey || loadingAltNames}
            className="w-full h-10.5 px-3 text-sm rounded-lg border border-gray-300 bg-white outline-none focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 transition disabled:bg-gray-50"
          >
            <option value="">{loadingAltNames ? "..." : "Alt Name"}</option>
            {altNameOptions.map(a => <option key={`${a.unitId}-${a.altName}`} value={String(a.unitId)}>{a.altName}</option>)}
          </select>
        </div>

        {/* Price */}
        <div className="flex flex-col gap-1.5 lg:col-span-1">
          <div className="flex justify-end items-center gap-1">
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
             id="hp-entry-price"
             type="number"
             min="0"
             value={entryPrice ?? ""}
             style={{ textAlign: 'right' }}
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
             className="w-full h-10.5 px-3 text-sm font-black text-[#49293e] bg-[#49293e]/5 rounded-lg border border-[#49293e]/10 outline-none focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 transition"
          />
        </div>

        <div className="flex flex-col gap-1.5 lg:col-span-1">
          <label className={`${labelClass} text-right`}>Disc(%)</label>
          <input
            id="hp-entry-disc-per"
            ref={discPercentRef}
            type="number"
            min="0"
            value={entryDiscPercent ?? ""}
            style={{ textAlign: 'right' }}
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
            className="w-full h-10.5 px-3 text-xs rounded-lg border border-gray-300 bg-white outline-none focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 transition"
          />
        </div>

        <div className="flex flex-col gap-1.5 lg:col-span-1">
          <label className={`${labelClass} text-right`}>Disc</label>
          <input
            id="hp-entry-disc-val"
            ref={discValueRef}
            type="number"
            min="0"
            value={entryDiscValue ?? ""}
            style={{ textAlign: 'right' }}
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
            className="w-full h-10.5 px-3 text-xs rounded-lg border border-gray-300 bg-white outline-none focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 transition"
          />
        </div>

        <div className="flex flex-col gap-1.5 lg:col-span-1">
          <label className={`${labelClass} text-right`}>Promo Price</label>
          <input
            id="hp-entry-promo"
            ref={promoPriceRef}
            type="number"
            min="0"
            value={entryPromoPrice ?? ""}
            style={{ textAlign: 'right' }}
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
              }
            }}
            placeholder={formatAmount(0)}
            className="w-full h-10.5 px-3 text-lg font-black text-pos-primary border-pos-primary/40 rounded-lg border bg-pos-primary/5 outline-none focus:border-pos-primary focus:ring-1 focus:ring-pos-primary/20 transition"
          />
        </div>


        {/* Add Button */}
        <div className="flex flex-col gap-1.5 lg:col-span-1">
          <label className="h-[15px]"></label>
          <Button 
            id="hp-entry-add-btn" 
            onClick={onAdd}
            className="w-full h-10.5 text-xs font-black uppercase tracking-widest bg-slate-800 hover:bg-slate-900 shadow-sm"
          >
            Add
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HappyHourEntryRow;
