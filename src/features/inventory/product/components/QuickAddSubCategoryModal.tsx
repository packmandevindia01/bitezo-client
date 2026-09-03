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

  const handleKeyDown = (e: React.KeyboardEvent, nextFieldId?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextFieldId) {
        document.getElementById(nextFieldId)?.focus();
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { form.reset(); onClose(); }} title="Quick Add Sub Category" size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 pb-2">
        <FormInput
          id="q-sub-code"
          label="Code"
          required
          autoFocus
          maxLength={50}
          {...register("code")}
          onKeyDown={(e) => handleKeyDown(e, "q-sub-name")}
          error={errors.code?.message}
        />
        <FormInput
          id="q-sub-name"
          label="Name"
          required
          maxLength={50}
          {...register("name")}
          onKeyDown={(e) => handleKeyDown(e, "q-sub-arabic")}
          error={errors.name?.message}
        />
        <FormInput
          id="q-sub-arabic"
          label="Arabic Name"
          maxLength={50}
          {...register("arabicName")}
          onKeyDown={(e) => handleKeyDown(e, "q-sub-category")}
        />
        <SearchableSelect
          id="q-sub-category"
          label="Category"
          required
          options={categoryOptions}
          value={watch("categoryId")}
          onChange={(v) => setValue("categoryId", v, { shouldValidate: true })}
          placeholder="Select Category"
          onKeyDown={(e) => handleKeyDown(e, "q-sub-active")}
          error={errors.categoryId?.message}
        />
        <div className="flex items-center h-10">
          <Checkbox
            id="q-sub-active"
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
