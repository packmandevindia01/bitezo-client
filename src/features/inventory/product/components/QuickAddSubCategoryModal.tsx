import { Button, Checkbox, FormInput, Modal } from "../../../../components/common";
import SearchableSelect from "../../../../components/common/Searchableselect";
import { Save, RotateCcw } from "lucide-react";
import { useQuickAddSubCategory } from "../hooks/useQuickAddSubCategory";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (id: string, name: string) => void;
  preselectedCategoryId?: string;
  categoryOptions: { label: string; value: string }[];
}

export const QuickAddSubCategoryModal = ({
  isOpen,
  onClose,
  onCreated,
  preselectedCategoryId,
  categoryOptions,
}: Props) => {
  const { form, handleSubmit, handleClear, isSaving } = useQuickAddSubCategory(
    onCreated,
    onClose,
    preselectedCategoryId,
  );
  const { register, watch, setValue, formState: { errors } } = form;

  return (
    <Modal isOpen={isOpen} onClose={() => { form.reset(); onClose(); }} title="Quick Add Sub Category" size="sm">
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
        <SearchableSelect
          label="Category"
          required
          options={categoryOptions}
          value={watch("categoryId")}
          onChange={(v) => setValue("categoryId", v, { shouldValidate: true })}
          placeholder="Select Category"
          error={errors.categoryId?.message}
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
