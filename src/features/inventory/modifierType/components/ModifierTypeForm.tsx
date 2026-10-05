import type { UseFormReturn } from "react-hook-form";
import { FormInput } from "../../../../components/common";
import type { ModifierTypeForm as ModifierTypeFormType } from "../schemas";

interface ModifierTypeFormProps {
  form: UseFormReturn<ModifierTypeFormType>;
  onSave?: () => void;
}

const ModifierTypeForm = ({ form, onSave }: ModifierTypeFormProps) => {
  const { register, formState: { errors } } = form;

  const handleEnter = (e: React.KeyboardEvent, nextId?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextId) {
        setTimeout(() => {
          const target = document.getElementById(nextId);
          if (target) {
            target.focus();
            if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
              try {
                target.setSelectionRange(0, target.value.length);
              } catch {
                target.select?.();
              }
            }
          } else {
            onSave?.();
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
        id="modtype-name"
        label="Name"
        required
        maxLength={15}
        placeholder="e.g. Extra Cheese"
        error={errors.name?.message}
        {...register("name")}
        onKeyDown={(e) => handleEnter(e, "modtype-arabic")}
        autoFocus
      />
      
      <FormInput
        id="modtype-arabic"
        label="Arabic Name"
        maxLength={15}
        placeholder="أدخل الاسم بالعربي"
        error={errors.arabicName?.message}
        {...register("arabicName")}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (onSave) {
              onSave();
            } else {
              handleEnter(e, "modtype-save");
            }
          }
        }}
      />
    </div>
  );
};

export default ModifierTypeForm;
