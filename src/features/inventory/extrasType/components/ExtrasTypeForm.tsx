
import type { UseFormReturn } from "react-hook-form";
import { FormInput } from "../../../../components/common";
import type { ExtrasTypeForm } from "../schemas";

interface ExtrasTypeFormProps {
  form: UseFormReturn<ExtrasTypeForm>;
  onSave?: () => void;
  saveButtonId?: string;
}

const ExtrasTypeFormComponent = ({ form, onSave, saveButtonId = "exttype-save" }: ExtrasTypeFormProps) => {
  const { register, formState: { errors } } = form;

  return (
    <div className="space-y-4 pt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput
          label="Name"
          id="exttype-name"
          placeholder="Enter name"
          maxLength={15}
          error={errors.name?.message}
          {...register("name", {
            onChange: () => form.clearErrors("name"),
          })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const nameVal = (e.currentTarget as HTMLInputElement).value?.trim() || form.getValues("name")?.trim();
              if (!nameVal) {
                void form.trigger("name");
                setTimeout(() => {
                  const el = document.getElementById("exttype-name");
                  el?.focus();
                  if (el instanceof HTMLInputElement) el.select?.();
                }, 20);
                return;
              }
              form.setValue("name", nameVal, { shouldValidate: true });
              form.clearErrors("name");
              setTimeout(() => {
                const arEl = document.getElementById("exttype-arabicName");
                if (arEl) {
                  arEl.focus();
                  if (arEl instanceof HTMLInputElement) arEl.select?.();
                } else if (onSave) {
                  onSave();
                } else {
                  document.getElementById(saveButtonId)?.click();
                }
              }, 20);
            }
          }}
          autoFocus
          required
        />

        <FormInput
          label="Arabic Name"
          id="exttype-arabicName"
          placeholder="Enter arabic name"
          maxLength={15}
          error={errors.arabicName?.message}
          {...register("arabicName", {
            onChange: () => form.clearErrors("arabicName"),
          })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const nameVal = form.getValues("name")?.trim();
              if (!nameVal) {
                void form.trigger("name");
                setTimeout(() => {
                  const el = document.getElementById("exttype-name");
                  el?.focus();
                  if (el instanceof HTMLInputElement) el.select?.();
                }, 20);
                return;
              }
              if (onSave) {
                onSave();
              } else {
                const saveBtn = document.getElementById(saveButtonId);
                saveBtn?.click();
              }
            }
          }}
        />
      </div>
    </div>
  );
};

export default ExtrasTypeFormComponent;
