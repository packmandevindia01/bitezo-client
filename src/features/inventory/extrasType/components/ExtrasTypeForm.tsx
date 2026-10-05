
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
    <div className="space-y-4 pt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput
          label="Name"
          id="exttype-name"
          placeholder="Enter name"
          maxLength={15}
          error={errors.name?.message}
          {...register("name")}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const nameVal = form.getValues("name");
              if (!nameVal || !nameVal.trim()) {
                void form.trigger("name");
                setTimeout(() => {
                  const el = document.getElementById("exttype-name");
                  el?.focus();
                  if (el instanceof HTMLInputElement) el.select?.();
                }, 20);
                return;
              }
              handleEnter(e, "exttype-arabicName");
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
          {...register("arabicName")}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const nameVal = form.getValues("name");
              if (!nameVal || !nameVal.trim()) {
                void form.trigger("name");
                setTimeout(() => {
                  const el = document.getElementById("exttype-name");
                  el?.focus();
                  if (el instanceof HTMLInputElement) el.select?.();
                }, 20);
                return;
              }
              handleEnter(e, saveButtonId);
            }
          }}
        />
      </div>
    </div>
  );
};

export default ExtrasTypeFormComponent;
