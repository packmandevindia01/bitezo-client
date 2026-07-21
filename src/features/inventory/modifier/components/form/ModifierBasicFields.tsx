import { Controller, type UseFormReturn } from "react-hook-form";
import { FormInput, SearchableSelect } from "../../../../../components/common";
import type { ModifierForm } from "../../schemas";
import { useModifierTypes } from "../../../modifierType/hooks/useModifierTypeQueries";

interface ModifierBasicFieldsProps {
  form: UseFormReturn<ModifierForm>;
}

const ModifierBasicFields = ({ form }: ModifierBasicFieldsProps) => {
  const { register, control, formState: { errors } } = form;
  const { data: modifierTypes = [], isLoading: isLoadingTypes } = useModifierTypes();

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
        id="mod-name"
        label="Name"
        required
        placeholder="e.g. Extra Mayo"
        error={errors.name?.message}
        {...register("name")}
        onKeyDown={(e) => handleEnter(e, "mod-arabic")}
        autoFocus
      />

      <FormInput
        id="mod-arabic"
        label="Arabic"
        placeholder="أدخل الاسم بالعربي"
        error={errors.arabic?.message}
        {...register("arabic")}
        onKeyDown={(e) => handleEnter(e, "mod-type")}
      />

      <Controller
        control={control}
        name="typeId"
        render={({ field }) => (
          <SearchableSelect
            id="mod-type"
            label="Type"
            required
            placeholder={isLoadingTypes ? "Loading types..." : "Select type"}
            error={errors.typeId?.message}
            options={modifierTypes.map((t) => ({ label: t.name, value: t.typeId.toString() }))}
            value={field.value ? field.value.toString() : ""}
            onChange={(val) => {
              field.onChange(Number(val));
              document.getElementById("mod-color")?.focus();
            }}
            onKeyDown={(e) => handleEnter(e, "mod-color")}
          />
        )}
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Display Color</label>
        <div className="flex h-10.5 items-center gap-3 rounded-lg border border-gray-300 bg-white px-3 transition-colors focus-within:border-[#49293e] focus-within:ring-1 focus-within:ring-[#49293e]/10">
          <input
            id="mod-color"
            type="color"
            {...register("color")}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
              }
            }}
            className="h-7 w-10 cursor-pointer rounded border-none bg-transparent p-0"
          />
          <span className="text-xs font-mono uppercase text-gray-500">{form.watch("color")}</span>
        </div>
      </div>
    </div>
  );
};

export default ModifierBasicFields;
