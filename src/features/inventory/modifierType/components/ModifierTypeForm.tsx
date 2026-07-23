import type { UseFormReturn } from "react-hook-form";
import { FormInput } from "../../../../components/common";
import type { ModifierTypeForm as ModifierTypeFormType } from "../schemas";

interface ModifierTypeFormProps {
  form: UseFormReturn<ModifierTypeFormType>;
}

const ModifierTypeForm = ({ form }: ModifierTypeFormProps) => {
  const { register, formState: { errors } } = form;

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
        id="modtype-name"
        label="Name"
        required
        placeholder="e.g. Extra Cheese"
        error={errors.name?.message}
        {...register("name")}
        onKeyDown={(e) => handleEnter(e, "modtype-arabic")}
        autoFocus
      />
      
      <FormInput
        id="modtype-arabic"
        label="Arabic Name"
        placeholder="أدخل الاسم بالعربي"
        error={errors.arabicName?.message}
        {...register("arabicName")}
        onKeyDown={(e) => handleEnter(e)}
      />
    </div>
  );
};

export default ModifierTypeForm;
