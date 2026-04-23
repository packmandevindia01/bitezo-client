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

  return (
    <div className="animate-in fade-in slide-in-from-left-2 duration-300">
      <h3 className="mb-4 text-base font-semibold text-gray-900">Product Details</h3>
      <div className="grid gap-x-6 md:grid-cols-2">
        <FormInput
          label="Product Name"
          value={form.name}
          disabled={saving}
          onChange={(e) => onChange("name", e.target.value)}
          required
          autoFocus
        />
        <SearchableSelect
          label="Unit"
          options={unitOptions}
          value={form.unitId}
          placeholder="Select unit"
          onChange={(v) => onChange("unitId", v)}
          required
          disabled={saving}
        />
        <FormInput
          label="Arabic Name"
          value={form.arabicName}
          disabled={saving}
          onChange={(e) => onChange("arabicName", e.target.value)}
        />
        <SearchableSelect
          label="Purchase VAT"
          options={vatOptions}
          value={form.pVatId}
          placeholder="Select purchase VAT"
          onChange={(v) => onChange("pVatId", v)}
          required
          disabled={saving}
        />
        <FormInput
          label="Product Code"
          value={form.code}
          disabled={saving}
          onChange={(e) => onChange("code", e.target.value)}
          required
        />
        <SearchableSelect
          label="Sales VAT"
          options={vatOptions}
          value={form.sVatId}
          placeholder="Select sales VAT"
          onChange={(v) => onChange("sVatId", v)}
          required
          disabled={saving}
        />
        <SearchableSelect
          label="Group"
          options={groupOptions}
          value={form.groupId}
          placeholder="Select group"
          onChange={(v) => onChange("groupId", v)}
          required
          disabled={saving}
        />
        <SearchableSelect
          label="Category"
          options={categoryOptions}
          value={form.categoryId}
          placeholder="Select category"
          onChange={(v) => onChange("categoryId", v)}
          required
          disabled={saving}
        />
        <FormInput
          label="Cost"
          type="text"
          inputMode="decimal"
          value={form.cost === "0" ? formatAmount(0, decimalPart) : form.cost}
          disabled={saving}
          onChange={(e) => {
            const next = sanitizeAmountInput(e.target.value, decimalPart);
            if (next !== null) onChange("cost", next);
          }}
          onFocus={(e) => e.target.select()}
          onBlur={(e) => {
            if (e.target.value !== "" && e.target.value !== ".") {
              onChange("cost", formatAmount(e.target.value, decimalPart));
            }
          }}
          required
        />
        <SearchableSelect
          label="Sub Category"
          options={subCatOptions}
          value={form.subCatId}
          placeholder={loadingSubs ? "Loading…" : "Select sub category"}
          onChange={(v) => onChange("subCatId", v)}
          disabled={saving || loadingSubs}
        />
        <SearchableSelect
          label="Branch"
          options={branchOptions}
          value={form.branchId}
          placeholder="Select branch"
          onChange={(v) => onChange("branchId", v)}
          required
          disabled={saving}
        />
        <SearchableSelect
          label="Type"
          options={productTypeOptions}
          value={form.typeId}
          placeholder="Select type"
          onChange={(v) => onChange("typeId", v)}
          required
          disabled={saving}
        />
      </div>
    </div>
  );
};
