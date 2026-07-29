
import type { UseFormReturn } from "react-hook-form";
import { FormInput } from "../../../../components/common";
import type { ExtrasTypeForm } from "../schemas";

interface ExtrasTypeFormProps {
  form: UseFormReturn<ExtrasTypeForm>;
}

const ExtrasTypeFormComponent = ({ form }: ExtrasTypeFormProps) => {
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
    <div className="space-y-4 pt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput
          label="Name"
          id="name"
          placeholder="Enter name"
          error={errors.name?.message}
          {...register("name")}
          onKeyDown={(e) => handleEnter(e, "exttype-arabicName")}
          autoFocus
          required
        />

        <FormInput
          label="Arabic Name"
          id="exttype-arabicName"
          placeholder="Enter arabic name"
          error={errors.arabicName?.message}
          {...register("arabicName")}
          onKeyDown={(e) => handleEnter(e, "exttype-save")}
        />
      </div>
    </div>
  );
};

export default ExtrasTypeFormComponent;
