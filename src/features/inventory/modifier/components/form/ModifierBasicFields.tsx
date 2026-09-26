import { type UseFormReturn } from "react-hook-form";
import { FormInput } from "../../../../../components/common";
import type { ModifierForm } from "../../schemas";

interface ModifierBasicFieldsProps {
  form: UseFormReturn<ModifierForm>;
  onSave?: () => void;
}

const ModifierBasicFields = ({ form, onSave }: ModifierBasicFieldsProps) => {
  const { register, formState: { errors } } = form;

  const handleKeyDown = (e: React.KeyboardEvent, nextFieldId?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextFieldId) {
        setTimeout(() => {
          const target = document.getElementById(nextFieldId);
          if (target) {
            target.focus();
            if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
              try {
                target.setSelectionRange(0, target.value.length);
              } catch {
                target.select?.();
              }
            }
          }
        }, 10);
      } else {
        onSave?.();
      }
    }
  };

  return (
    <div className="grid gap-x-4 gap-y-3 md:grid-cols-2">
      <FormInput
        id="mod-name"
        label="Name"
        required
        maxLength={20}
        placeholder="e.g. Extra Mayo"
        error={errors.name?.message}
        {...register("name", {
          onChange: (e) => {
            if (e.target.value && e.target.value.length > 20) {
              e.target.value = e.target.value.slice(0, 20);
            }
          },
        })}
        onKeyDown={(e) => handleKeyDown(e, "mod-arabic")}
        autoFocus
      />

      <FormInput
        id="mod-arabic"
        label="Arabic"
        placeholder="أدخل الاسم بالعربي"
        error={errors.arabic?.message}
        {...register("arabic")}
        onKeyDown={(e) => handleKeyDown(e)}
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Display Color</label>
        <div className="flex h-10.5 items-center gap-3 rounded-lg border border-gray-300 bg-white px-3 transition-colors focus-within:border-[#49293e] focus-within:ring-1 focus-within:ring-[#49293e]/10">
          <input
            id="mod-color"
            type="color"
            {...register("color")}
            onKeyDown={(e) => handleKeyDown(e)}
            className="h-7 w-10 cursor-pointer rounded border-none bg-transparent p-0"
          />
          <span className="text-xs font-mono uppercase text-gray-500">{form.watch("color")}</span>
        </div>
      </div>
    </div>
  );
};

export default ModifierBasicFields;
