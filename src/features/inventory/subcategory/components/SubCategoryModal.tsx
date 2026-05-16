import { Save, RotateCcw, Trash2 } from "lucide-react";
import {
  Button,
  Checkbox,
  FormInput,
  ImageUploadPanel,
  Modal,
  SelectInput,
} from "../../../../components/common";

interface SubCategoryFormState {
  code: string;
  name: string;
  arabicName: string;
  categoryId: number | "";
  isActive: boolean;
  image: string;
}

interface Props {
  isOpen: boolean;
  editingId: number | null;
  form: SubCategoryFormState;
  categoryOptions: { label: string; value: number }[];
  saving: boolean;
  onClose: () => void;
  onImageSelect: (file: File | null) => void;
  onChange: (patch: Partial<SubCategoryFormState>) => void;
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
  onImageSelect,
  onChange,
  onClear,
  onSave,
  onDelete,
}: Props) => {
  const handleKeyDown = (e: React.KeyboardEvent, nextFieldId?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextFieldId) {
        document.getElementById(nextFieldId)?.focus();
      }
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
          <ImageUploadPanel preview={form.image} onSelect={onImageSelect} />
        </div>

        <div className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
            <FormInput
              id="subcat-code"
              label="Code"
              value={form.code}
              onChange={(e) => onChange({ code: e.target.value.toUpperCase().replace(/\s/g, '') })}
              onKeyDown={(e) => handleKeyDown(e, "subcat-name")}
              placeholder="Enter code"
              autoFocus
            />

            <FormInput
              id="subcat-name"
              label="Name"
              value={form.name}
              onChange={(e) => onChange({ name: e.target.value })}
              onKeyDown={(e) => handleKeyDown(e, "subcat-arabic")}
              placeholder="Enter name"
            />

            <FormInput
              id="subcat-arabic"
              label="Arabic Name"
              value={form.arabicName}
              onChange={(e) => onChange({ arabicName: e.target.value })}
              onKeyDown={(e) => handleKeyDown(e, "subcat-category")}
              placeholder="أدخل اسم الفئة الفرعية"
            />

            <SelectInput
              id="subcat-category"
              label="Category"
              options={categoryOptions.map(opt => ({ label: opt.label, value: String(opt.value) }))}
              value={String(form.categoryId)}
              onChange={(e) => onChange({ categoryId: Number(e.target.value) })}
              placeholder="Choose category"
            />

            <div className="md:col-span-2 flex items-center pt-1">
              <Checkbox
                label="Active Status"
                checked={form.isActive}
                onChange={(e) => onChange({ isActive: e.target.checked })}
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
