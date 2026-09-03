import { Save, RotateCcw, Trash2 } from "lucide-react";
import {
  Button,
  Checkbox,
  FormInput,
  ImageUploadPanel,
  Modal,
} from "../../../../components/common";
import SearchableSelect from "../../../../components/common/Searchableselect";
import type { UseFormReturn } from "react-hook-form";
import type { SubCategoryForm } from "../schemas";

interface Props {
  isOpen: boolean;
  editingId: number | null;
  form: UseFormReturn<SubCategoryForm>;
  categoryOptions: { label: string; value: number }[];
  saving: boolean;
  onClose: () => void;
  onClear: () => void;
  onSave: () => void;
  onDelete?: () => void;
}

const SubCategoryModal = ({
  isOpen,
  editingId,
  form,
  categoryOptions,
  saving,
  onClose,
  onClear,
  onSave,
  onDelete,
}: Props) => {
  const { register, watch, setValue, formState: { errors } } = form;

  const image = watch("image");
  const isActive = watch("isActive");
  const categoryId = watch("categoryId");

  const handleKeyDown = (e: React.KeyboardEvent, nextFieldId?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextFieldId) {
        document.getElementById(nextFieldId)?.focus();
      }
    }
  };

  const onImageSelect = (file: File | null) => {
    setValue("imageFile", file, { shouldDirty: true });
    if (file) {
      const url = URL.createObjectURL(file);
      setValue("image", url);
    } else {
      setValue("image", undefined);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingId ? "Edit Sub Category" : "Add Sub Category"}
      size="xl"
    >
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="shrink-0">
          <ImageUploadPanel preview={image} onSelect={onImageSelect} />
        </div>

        <div className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
            <FormInput
              id="subcat-code"
              label="Code"
              required
              maxLength={50}
              {...register("code")}
              onChange={(e) => setValue("code", e.target.value.toUpperCase().replace(/\s/g, ''), { shouldValidate: true, shouldDirty: true })}
              onKeyDown={(e) => handleKeyDown(e, "subcat-name")}
              placeholder="Enter code"
              error={errors.code?.message}
              autoFocus
            />

            <FormInput
              id="subcat-name"
              label="Name"
              required
              maxLength={50}
              {...register("name")}
              onKeyDown={(e) => handleKeyDown(e, "subcat-arabic")}
              placeholder="Enter name"
              error={errors.name?.message}
            />

            <FormInput
              id="subcat-arabic"
              label="Arabic Name"
              maxLength={50}
              {...register("arabicName")}
              onKeyDown={(e) => handleKeyDown(e, "subcat-category")}
              placeholder="Enter arabic name"
              error={errors.arabicName?.message}
              dir="rtl"
            />

            <SearchableSelect
              id="subcat-category"
              label="Category"
              required
              options={categoryOptions.map(opt => ({ label: opt.label, value: String(opt.value) }))}
              value={categoryId !== "" ? String(categoryId) : ""}
              onChange={(v) => setValue("categoryId", Number(v), { shouldValidate: true, shouldDirty: true })}
              placeholder="Select category"
              error={errors.categoryId?.message}
            />

            <div className="md:col-span-2 flex items-center pt-1">
              <Checkbox
                label="Active Status"
                checked={isActive}
                onChange={(e) => setValue("isActive", e.target.checked, { shouldDirty: true })}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4">
            <Button 
              variant="secondary" 
              onClick={onClear} 
              disabled={saving} 
              tabIndex={-1}
              isAction
              icon={<RotateCcw size={18} />}
            >
              Clear
            </Button>
            <Button 
              onClick={onSave} 
              disabled={saving}
              isAction
              loading={saving}
              icon={<Save size={18} />}
            >
              Save
            </Button>
            {editingId && (
              <Button
                variant="danger"
                onClick={onDelete}
                disabled={saving}
                isAction
                icon={<Trash2 size={18} />}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SubCategoryModal;

