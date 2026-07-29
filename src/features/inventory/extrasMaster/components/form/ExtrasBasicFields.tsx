import { useState } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { FormInput, SearchableSelect } from "../../../../../components/common";
import { Plus } from "lucide-react";
import type { ExtrasMasterForm } from "../../schemas";
import { useExtrasTypes } from "../../../extrasType/hooks/useExtrasTypeQueries";
import { ExtrasTypeQuickAddModal } from "../../../extrasType/components/ExtrasTypeQuickAddModal";

interface ExtrasBasicFieldsProps {
  form: UseFormReturn<ExtrasMasterForm>;
}

const ExtrasBasicFields = ({ form }: ExtrasBasicFieldsProps) => {
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const { register, control, formState: { errors } } = form;
  const { data: extrasTypes = [], isLoading: isLoadingTypes } = useExtrasTypes();

  const handleEnter = (e: React.KeyboardEvent, nextId?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextId) {
        document.getElementById(nextId)?.focus();
      }
    }
  };

  return (
    <div className="grid gap-x-4 gap-y-3 md:grid-cols-2">
      <FormInput
        id="ext-name"
        label="Name"
        required
        placeholder="e.g. Extra Mayo"
        error={errors.name?.message}
        {...register("name")}
        onKeyDown={(e) => handleEnter(e, "ext-arabic")}
        autoFocus
      />

      <FormInput
        id="ext-arabic"
        label="Arabic"
        placeholder="أدخل الاسم بالعربي"
        error={errors.arabic?.message}
        {...register("arabic")}
        onKeyDown={(e) => handleEnter(e, "ext-type")}
      />

      <Controller
        control={control}
        name="typeId"
        render={({ field }) => (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <SearchableSelect
                id="ext-type"
                label="Type"
                required
                placeholder={isLoadingTypes ? "Loading types..." : "Select type"}
                error={errors.typeId?.message}
                options={extrasTypes.map((t) => ({ label: t.name, value: t.typeId.toString() }))}
                value={field.value ? field.value.toString() : ""}
                onChange={(val) => {
                  field.onChange(Number(val));
                  // Focus next field
                  document.getElementById("ext-price")?.focus();
                }}
                onKeyDown={(e) => handleEnter(e, "ext-price")}
              />
            </div>
            <button
              type="button"
              onClick={() => setIsTypeModalOpen(true)}
              disabled={isLoadingTypes}
              className="h-[42px] w-[42px] flex-shrink-0 flex items-center justify-center bg-[#49293e] hover:bg-[#3d2234] text-white rounded-[10px] transition-colors mb-0.5"
            >
              <Plus size={18} />
            </button>
          </div>
        )}
      />

      <FormInput
        id="ext-price"
        label="Price"
        type="number"
        min={0}
        step={0.01}
        required
        placeholder="0.00"
        error={errors.price?.message}
        {...register("price")}
        onKeyDown={(e) => handleEnter(e, "ext-color")}
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Display Color</label>
        <div className="flex h-10.5 items-center gap-3 rounded-lg border border-gray-300 bg-white px-3 transition-colors focus-within:border-[#49293e] focus-within:ring-1 focus-within:ring-[#49293e]/10">
          <input
            id="ext-color"
            type="color"
            {...register("color")}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                // Optionally save or nothing
              }
            }}
            className="h-7 w-10 cursor-pointer rounded border-none bg-transparent p-0"
          />
          <span className="text-xs font-mono uppercase text-gray-500">{form.watch("color")}</span>
        </div>
      </div>

      <ExtrasTypeQuickAddModal 
        isOpen={isTypeModalOpen} 
        onClose={() => setIsTypeModalOpen(false)} 
        onSuccess={(id) => {
          form.setValue("typeId", id, { shouldValidate: true, shouldDirty: true });
        }}
      />
    </div>
  );
};

export default ExtrasBasicFields;
