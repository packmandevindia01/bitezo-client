
import type { UseFormReturn } from "react-hook-form";
import { FormInput } from "../../../../components/common";
import type { ExtrasTypeForm } from "../schemas";

interface ExtrasTypeFormProps {
  form: UseFormReturn<ExtrasTypeForm>;
}

const ExtrasTypeFormComponent = ({ form }: ExtrasTypeFormProps) => {
  const { register, formState: { errors } } = form;

  return (
    <div className="space-y-4 pt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput
          label="Name"
          id="name"
          placeholder="Enter name"
          error={errors.name?.message}
          {...register("name")}
          required
        />

        <FormInput
          label="Arabic Name"
          id="arabicName"
          placeholder="Enter arabic name"
          error={errors.arabicName?.message}
          {...register("arabicName")}
        />
      </div>
    </div>
  );
};

export default ExtrasTypeFormComponent;
