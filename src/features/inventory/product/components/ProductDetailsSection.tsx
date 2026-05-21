import { FormInput } from "../../../../components/common";
import SearchableSelect from "../../../../components/common/Searchableselect";
import { productTypeOptions } from "../constants";
import type { ProductFormState, ProductMasterData } from "../types";
import { formatAmount, sanitizeAmountInput } from "../../../../utils/formatters";
import { useAppSelector } from "../../../../app/hooks";
import { selectDecimalPart } from "../../../auth/store/authSlice";

interface ProductDetailsSectionProps {
  form: ProductFormState;
  saving: boolean;
  masterData: ProductMasterData | null;
  branchOptions: { label: string; value: string }[];
  subCatOptions: { label: string; value: string }[];
  loadingSubs: boolean;
  onChange: <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => void;
}

export const ProductDetailsSection = ({
  form,
  saving,
  masterData,
  branchOptions,
  subCatOptions,
  loadingSubs,
  onChange,
}: ProductDetailsSectionProps) => {
  const decimalPart = useAppSelector(selectDecimalPart);
  const categoryOptions = masterData?.category?.map(c => ({ label: c.name, value: String(c.id) })) ?? [];
  const groupOptions = masterData?.group?.map(g => ({ label: g.name, value: String(g.id) })) ?? [];
  const unitOptions = masterData?.unit?.map(u => ({ label: u.name, value: String(u.id) })) ?? [];
  const vatOptions = masterData?.vat?.map(v => ({ label: `${v.name} (${v.value}%)`, value: String(v.id) })) ?? [];
  const typeOptions = masterData?.type?.map(t => ({ label: t.name, value: String(t.id) })) ?? productTypeOptions;
  const colorValue = /^#[0-9a-fA-F]{6}$/.test(form.colorCode || "") ? form.colorCode : "#49293e";

  const handleKeyDown = (e: React.KeyboardEvent, nextFieldId?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextFieldId) {
        document.getElementById(nextFieldId)?.focus();
      }
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-left-2 duration-300">
      <div className="grid gap-x-3 gap-y-3 md:grid-cols-2 lg:grid-cols-3">
        <FormInput
          id="prod-name"
          label="Product Name"
          value={form.name}
          disabled={saving}
          onChange={(e) => onChange("name", e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "prod-arabic")}
          required
          autoFocus
        />
        <FormInput
          id="prod-arabic"
          label="Arabic Name"
          value={form.arabicName}
          disabled={saving}
          onChange={(e) => onChange("arabicName", e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "prod-code")}
        />
        <SearchableSelect
          id="prod-unit"
          label="Unit"
          options={unitOptions}
          value={form.unitId}
          placeholder="Select unit"
          onChange={(v) => onChange("unitId", v)}
          required
          disabled={saving}
        />

        <FormInput
          id="prod-code"
          label="Product Code"
          value={form.code}
          disabled={saving}
          onChange={(e) => onChange("code", e.target.value.toUpperCase().replace(/\s/g, '_'))}
          onKeyDown={(e) => handleKeyDown(e, "prod-barcode")}
          required
        />
        <FormInput
          id="prod-barcode"
          label="Barcode"
          value={form.barcode}
          disabled={saving}
          onChange={(e) => onChange("barcode", e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "prod-cost")}
        />
        <SearchableSelect
          id="prod-branch"
          label="Branch"
          options={branchOptions}
          value={form.branchId}
          placeholder="Select branch"
          onChange={(v) => onChange("branchId", v)}
          required
          disabled={saving}
        />

        <SearchableSelect
          id="prod-group"
          label="Group"
          options={groupOptions}
          value={form.groupId}
          placeholder="Select group"
          onChange={(v) => onChange("groupId", v)}
          required
          disabled={saving}
        />
        <SearchableSelect
          id="prod-category"
          label="Category"
          options={categoryOptions}
          value={form.categoryId}
          placeholder="Select category"
          onChange={(v) => onChange("categoryId", v)}
          required
          disabled={saving}
        />
        <SearchableSelect
          id="prod-subcat"
          label="Sub Category"
          options={subCatOptions}
          value={form.subCatId}
          placeholder={loadingSubs ? "Loading…" : "Select sub category"}
          onChange={(v) => onChange("subCatId", v)}
          disabled={saving || loadingSubs}
        />

        <FormInput
          id="prod-cost"
          label="Cost"
          type="text"
          inputMode="decimal"
          inputClassName="text-right"
          value={form.cost === "0" ? formatAmount(0, decimalPart) : form.cost}
          disabled={saving}
          onChange={(e) => {
            const textVal = sanitizeAmountInput(e.target.value, decimalPart);
            if (textVal !== null) onChange("cost", textVal);
          }}
          onFocus={(e) => e.target.select()}
          onBlur={(e) => {
            if (e.target.value !== "" && e.target.value !== ".") {
              onChange("cost", formatAmount(e.target.value, decimalPart));
            }
          }}
          onKeyDown={(e) => handleKeyDown(e, "prod-price")}
          required
        />
        <div className="flex flex-col">
          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest mb-1 px-1">
            <label htmlFor="prod-price" className="text-slate-600">
              Price <span className="text-amber-500 font-bold">*</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer group text-slate-500 select-none">
              <input
                type="checkbox"
                checked={form.priceIsIncl}
                onChange={(e) => onChange("priceIsIncl", e.target.checked)}
                disabled={saving}
                className="h-3.5 w-3.5 rounded border-gray-300 text-[#49293e] focus:ring-[#49293e] transition-all cursor-pointer"
              />
              <span>INCL.</span>
            </label>
          </div>
          <FormInput
            id="prod-price"
            label="price"
            hideLabel
            type="text"
            inputMode="decimal"
            inputClassName="text-right"
            value={form.price === "0" ? formatAmount(0, decimalPart) : form.price}
            disabled={saving}
            onChange={(e) => {
              const textVal = sanitizeAmountInput(e.target.value, decimalPart);
              if (textVal !== null) onChange("price", textVal);
            }}
            onFocus={(e) => e.target.select()}
            onBlur={(e) => {
              if (e.target.value !== "" && e.target.value !== ".") {
                onChange("price", formatAmount(e.target.value, decimalPart));
              }
            }}
            required
          />
        </div>
        <SearchableSelect
          id="prod-p-vat"
          label="Purchase VAT"
          options={vatOptions}
          value={form.pVatId}
          placeholder="Select purchase VAT"
          onChange={(v) => onChange("pVatId", v)}
          required
          disabled={saving}
        />

        <SearchableSelect
          id="prod-type"
          label="Type"
          options={typeOptions}
          value={form.typeId}
          placeholder="Select type"
          onChange={(v) => onChange("typeId", v)}
          required
          disabled={saving}
        />
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Product Color</label>
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50/30 px-3 py-1 h-10.5">
            <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-lg border border-gray-200 shadow-sm">
              <input
                type="color"
                value={colorValue}
                onChange={(e) => onChange("colorCode", e.target.value)}
                disabled={saving}
                className="absolute inset-[-50%] h-[200%] w-[200%] cursor-pointer border-none bg-transparent"
              />
            </div>
            <input
              type="text"
              value={colorValue}
              onChange={(e) => onChange("colorCode", e.target.value)}
              disabled={saving}
              className="w-full rounded-md border-none bg-transparent text-xs font-mono outline-none focus:ring-0 uppercase"
              placeholder="#000000"
              maxLength={7}
            />
          </div>
        </div>
        <SearchableSelect
          id="prod-s-vat"
          label="Sales VAT"
          options={vatOptions}
          value={form.sVatId}
          placeholder="Select sales VAT"
          onChange={(v) => onChange("sVatId", v)}
          required
          disabled={saving}
        />
      </div>
    </div>
  );
};
