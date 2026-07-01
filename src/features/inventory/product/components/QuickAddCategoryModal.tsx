import { Button, Checkbox, FormInput, Modal } from "../../../../components/common";
import { Save, RotateCcw } from "lucide-react";
import { useQuickAddCategory } from "../hooks/useQuickAddCategory";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (id: string, name: string) => void;
}

export const QuickAddCategoryModal = ({ isOpen, onClose, onCreated }: Props) => {
  const { form, handleSubmit, handleClear, isSaving } = useQuickAddCategory(onCreated, onClose);
  const { register, watch, setValue, formState: { errors } } = form;

  return (
    <Modal isOpen={isOpen} onClose={() => { form.reset(); onClose(); }} title="Quick Add Category" size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 pb-2">
        <FormInput
          label="Code"
          required
          autoFocus
          {...register("code")}
          error={errors.code?.message}
        />
        <FormInput
          label="Name"
          required
          {...register("name")}
          error={errors.name?.message}
        />
        <FormInput
          label="Arabic Name"
          {...register("arabicName")}
        />
        <div className="flex items-center h-10">
          <Checkbox
            label="Active"
            checked={watch("isActive")}
            onChange={(e) => setValue("isActive", e.target.checked)}
          />
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Button type="button" variant="secondary" onClick={handleClear} tabIndex={-1} isAction icon={<RotateCcw size={16} />}>
            Clear
          </Button>
          <Button type="submit" loading={isSaving} isAction icon={<Save size={16} />}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
};
