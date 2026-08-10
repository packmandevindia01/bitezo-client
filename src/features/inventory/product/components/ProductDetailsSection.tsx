import { useState } from "react";
import { Plus } from "lucide-react";
import { FormInput } from "../../../../components/common";
import SearchableSelect from "../../../../components/common/Searchableselect";
import { productTypeOptions } from "../constants";
import type { UseFormReturn } from "react-hook-form";
import type { ProductFormData } from "../schema/productSchema";
import type { ProductMasterData } from "../types";
import { useAppSelector } from "../../../../app/hooks";
import { selectDecimalPart } from "../../../auth/store/authSlice";
import { QuickAddGroupModal } from "./QuickAddGroupModal";
import { QuickAddCategoryModal } from "./QuickAddCategoryModal";
import { QuickAddSubCategoryModal } from "./QuickAddSubCategoryModal";
import { QuickAddUnitModal } from "./QuickAddUnitModal";
import { useEnterKeyNavigation } from "../../../../hooks/useEnterKeyNavigation";

interface ProductDetailsSectionProps {
  form: UseFormReturn<ProductFormData>;
  masterData: ProductMasterData | null;
  subCatOptions: { label: string; value: string }[];
  branchOptions: { label: string; value: string }[];
}

// Small reusable (+) button aligned to a select
const AddButton = ({ onClick, title }: { onClick: () => void; title: string }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className="shrink-0 mb-1 h-10.5 w-9 flex items-center justify-center rounded-lg border border-[#49293e] bg-[#49293e] text-white hover:bg-[#3c2232] hover:border-[#3c2232] transition-colors"
  >
    <Plus size={16} />
  </button>
);

export const ProductDetailsSection = ({
  form,
  masterData,
  subCatOptions,
  branchOptions,
}: ProductDetailsSectionProps) => {
  const { register, watch, setValue, formState: { errors } } = form;
  const decimalPart = useAppSelector(selectDecimalPart);

  const ensureOption = (options: { label: string; value: string }[], currentVal: string, name: string) => {
    if (currentVal && !options.some(o => o.value === currentVal)) {
      return [...options, { label: `Invalid ${name} (${currentVal})`, value: currentVal }];
    }
    return options;
  };

  const categoryOptions = ensureOption(masterData?.category?.map((c: any) => ({ label: c.name || c.categoryName || "Unknown", value: String(c.id ?? c.categoryId ?? "") })) ?? [], watch("categoryId") || "", "Category");
  const groupOptions = ensureOption(masterData?.group?.map((g: any) => ({ label: g.name || g.groupName || "Unknown", value: String(g.id ?? g.groupId ?? "") })) ?? [], watch("groupId") || "", "Group");
  const unitOptions = ensureOption(masterData?.unit?.map((u: any) => ({ label: u.name || u.unitName || "Unknown", value: String(u.id ?? u.unitId ?? "") })) ?? [], watch("unitId") || "", "Unit");
  const vatOptionsRaw = masterData?.vat?.map((v: any) => {
    const vName = v.name || v.vatName || "";
    const vVal = v.value ?? v.vatValue ?? 0;
    return {
      label: vName.includes(String(vVal)) ? vName : `${vName} (${vVal}%)`,
      value: String(v.id ?? v.vatId ?? "")
    };
  }) ?? [];
  const pVatOptions = ensureOption(vatOptionsRaw, watch("pVatId") || "", "VAT");
  const sVatOptions = ensureOption(vatOptionsRaw, watch("sVatId") || "", "VAT");
  
  const typeOptions = ensureOption(
    (masterData?.type && masterData.type.length > 0)
      ? masterData.type.map((t: any) => ({
          label: t.name || t.productTypeName || t.typeName || "Unknown",
          value: String(t.id ?? t.productTypeId ?? t.typeId ?? "")
        }))
      : productTypeOptions,
    watch("typeId") || "",
    "Type"
  );
  const branchOptionsSafe = ensureOption(branchOptions, watch("branchId") || "", "Branch");
  const subCatOptionsSafe = ensureOption(subCatOptions, watch("subCatId") || "", "Sub-Category");

  const colorValue = /^#[0-9a-fA-F]{6}$/.test(watch("colorCode") || "") ? watch("colorCode") : "#49293e";

  // Quick-add modal state
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [subCatModalOpen, setSubCatModalOpen] = useState(false);
  const [unitModalOpen, setUnitModalOpen] = useState(false);

  const handleKeyDown = useEnterKeyNavigation();

  return (
    <div className="animate-in fade-in slide-in-from-left-2 duration-300">
      <div className="grid gap-x-3 gap-y-3 md:grid-cols-2 lg:grid-cols-3">
        <SearchableSelect
          id="prod-branch"
          label="Branch"
          options={branchOptionsSafe}
          value={watch("branchId")}
          placeholder="Select branch"
          onChange={(v) => setValue("branchId", v, { shouldValidate: true })}
          required
          onKeyDown={(e) => handleKeyDown(e, "prod-name")}
          error={errors.branchId?.message as string}
        />
        <FormInput
          id="prod-name"
          label="Product Name"
          {...register("name")}
          maxLength={500}
          onKeyDown={(e) => handleKeyDown(e, "prod-arabic")}
          required
          autoFocus
          error={errors.name?.message as string}
        />
        <FormInput
          id="prod-arabic"
          label="Arabic Name"
          {...register("arabicName")}
          maxLength={500}
          onKeyDown={(e) => handleKeyDown(e, "prod-unit")}
        />

        {/* Unit with (+) button */}
        <div className="flex items-end gap-1.5">
          <div className="flex-1 min-w-0">
            <SearchableSelect
              id="prod-unit"
              label="Unit"
              options={unitOptions}
              value={watch("unitId")}
              placeholder="Select unit"
              onChange={(v) => setValue("unitId", v, { shouldValidate: true })}
              required
              onKeyDown={(e) => handleKeyDown(e, "prod-code")}
              error={errors.unitId?.message as string}
            />
          </div>
          <AddButton onClick={() => setUnitModalOpen(true)} title="Quick Add Unit" />
        </div>

        <FormInput
          id="prod-code"
          label="Product Code"
          value={watch("code")}
          maxLength={100}
          onChange={(e) => setValue("code", e.target.value.toUpperCase().replace(/\s/g, '_'), { shouldValidate: true })}
          onKeyDown={(e) => handleKeyDown(e, "prod-barcode")}
          required
          error={errors.code?.message as string}
        />
        <FormInput
          id="prod-barcode"
          label="Barcode"
          {...register("barcode")}
          maxLength={100}
          onKeyDown={(e) => handleKeyDown(e, "prod-group")}
          error={errors.barcode?.message as string}
        />

        {/* Group with (+) button */}
        <div className="flex items-end gap-1.5">
          <div className="flex-1 min-w-0">
            <SearchableSelect
              id="prod-group"
              label="Group"
              options={groupOptions}
              value={watch("groupId")}
              placeholder="Select group"
              onChange={(v) => setValue("groupId", v, { shouldValidate: true })}
              required
              onKeyDown={(e) => handleKeyDown(e, "prod-category")}
              error={errors.groupId?.message as string}
            />
          </div>
          <AddButton onClick={() => setGroupModalOpen(true)} title="Quick Add Group" />
        </div>

        {/* Category with (+) button */}
        <div className="flex items-end gap-1.5">
          <div className="flex-1 min-w-0">
            <SearchableSelect
              id="prod-category"
              label="Category"
              options={categoryOptions}
              value={watch("categoryId")}
              placeholder="Select category"
              onChange={(v) => {
                setValue("categoryId", v, { shouldValidate: true });
                setValue("subCatId", ""); // Reset subcategory when category changes
              }}
              required
              onKeyDown={(e) => handleKeyDown(e, "prod-subcat")}
              error={errors.categoryId?.message as string}
            />
          </div>
          <AddButton onClick={() => setCategoryModalOpen(true)} title="Quick Add Category" />
        </div>

        {/* Sub Category with (+) button */}
        <div className="flex items-end gap-1.5">
          <div className="flex-1 min-w-0">
            <SearchableSelect
              id="prod-subcat"
              label="Sub Category"
              options={subCatOptionsSafe}
              value={watch("subCatId")}
              placeholder={"Select sub category"}
              onChange={(v) => setValue("subCatId", v, { shouldValidate: true })}
              onKeyDown={(e) => handleKeyDown(e, "prod-cost")}
              error={errors.subCatId?.message as string}
            />
          </div>
          <AddButton onClick={() => setSubCatModalOpen(true)} title="Quick Add Sub Category" />
        </div>

        <FormInput
          id="prod-cost"
          label="Cost"
          type="number"
          step={Math.pow(10, -decimalPart).toString()}
          inputClassName="text-right"
          {...register("cost")}
          onFocus={(e) => e.target.select()}
          onInput={(e) => {
            if (e.currentTarget.value.length > 15) {
              e.currentTarget.value = e.currentTarget.value.slice(0, 15);
            }
          }}
          onKeyDown={(e) => handleKeyDown(e, "prod-price-incl")}
          required
          error={errors.cost?.message as string}
        />
        <div className="flex flex-col">
          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest mb-1 px-1">
            <label htmlFor="prod-price" className="text-slate-600">
              Price <span className="text-red-500 font-bold">*</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer group text-slate-500 select-none">
              <input
                id="prod-price-incl"
                type="checkbox"
                checked={watch("priceIsIncl")}
                onChange={(e) => setValue("priceIsIncl", e.target.checked, { shouldValidate: true })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setValue("priceIsIncl", !watch("priceIsIncl"), { shouldValidate: true });
                    handleKeyDown(e, "prod-price");
                  }
                }}
                className="h-3.5 w-3.5 rounded border-gray-300 text-[#49293e] focus:ring-[#49293e] transition-all cursor-pointer"
              />
              <span>INCL.</span>
            </label>
          </div>
          <FormInput
            id="prod-price"
            label="price"
            hideLabel
            type="number"
            step={Math.pow(10, -decimalPart).toString()}
            inputClassName="text-right"
            {...register("price")}
            onFocus={(e) => e.target.select()}
            onInput={(e) => {
              if (e.currentTarget.value.length > 15) {
                e.currentTarget.value = e.currentTarget.value.slice(0, 15);
              }
            }}
            onKeyDown={(e) => handleKeyDown(e, "prod-p-vat")}
            required
            error={errors.price?.message as string}
          />
        </div>
        <SearchableSelect
          id="prod-p-vat"
          label="Purchase VAT"
          options={pVatOptions}
          value={watch("pVatId")}
          placeholder="Select purchase VAT"
          onChange={(v) => setValue("pVatId", v, { shouldValidate: true })}
          required
          onKeyDown={(e) => handleKeyDown(e, "prod-type")}
          error={errors.pVatId?.message as string}
        />

        <SearchableSelect
          id="prod-type"
          label="Type"
          options={typeOptions}
          value={watch("typeId")}
          placeholder="Select type"
          onChange={(v) => setValue("typeId", v, { shouldValidate: true })}
          required
          onKeyDown={(e) => handleKeyDown(e, "prod-color")}
          error={errors.typeId?.message as string}
        />
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Product Color</label>
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50/30 px-3 py-1 h-10.5">
            <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-lg border border-gray-200 shadow-sm">
              <input
                type="color"
                value={colorValue}
                onChange={(e) => setValue("colorCode", e.target.value, { shouldValidate: true })}
                onKeyDown={(e) => handleKeyDown(e, "prod-s-vat")}
                className="absolute inset-[-50%] h-[200%] w-[200%] cursor-pointer border-none bg-transparent"
              />
            </div>
            <input
              id="prod-color"
              type="text"
              value={colorValue}
              onChange={(e) => setValue("colorCode", e.target.value, { shouldValidate: true })}
              onKeyDown={(e) => handleKeyDown(e, "prod-s-vat")}
              className="w-full rounded-md border-none bg-transparent text-xs font-mono outline-none focus:ring-0 uppercase"
              placeholder="#000000"
              maxLength={7}
            />
          </div>
        </div>
        <SearchableSelect
          id="prod-s-vat"
          label="Sales VAT"
          options={sVatOptions}
          value={watch("sVatId")}
          placeholder="Select sales VAT"
          onChange={(v) => setValue("sVatId", v, { shouldValidate: true })}
          required
          error={errors.sVatId?.message as string}
        />
      </div>

      {/* Quick Add Modals */}
      <QuickAddGroupModal
        isOpen={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        onCreated={(id) => {
          setValue("groupId", id, { shouldValidate: true });
          setTimeout(() => document.getElementById("prod-group")?.focus(), 100);
        }}
      />
      <QuickAddCategoryModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        onCreated={(id) => {
          setValue("categoryId", id, { shouldValidate: true });
          setValue("subCatId", "");
          setTimeout(() => document.getElementById("prod-category")?.focus(), 100);
        }}
      />
      <QuickAddSubCategoryModal
        isOpen={subCatModalOpen}
        onClose={() => setSubCatModalOpen(false)}
        preselectedCategoryId={watch("categoryId")}
        categoryOptions={categoryOptions}
        onCreated={(id) => {
          setValue("subCatId", id, { shouldValidate: true });
          setTimeout(() => document.getElementById("prod-subcat")?.focus(), 100);
        }}
      />
      <QuickAddUnitModal
        isOpen={unitModalOpen}
        onClose={() => setUnitModalOpen(false)}
        onCreated={(id) => {
          setValue("unitId", id, { shouldValidate: true });
          setTimeout(() => document.getElementById("prod-unit")?.focus(), 100);
        }}
      />
    </div>
  );
};
