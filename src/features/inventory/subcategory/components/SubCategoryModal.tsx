import { Loader2, Trash2 } from "lucide-react";
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
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingId ? "Edit Sub Category" : "Add Sub Category"}
      size="xl"
    >
      <div className="flex flex-col gap-6 lg:flex-row">
        <ImageUploadPanel preview={form.image} onSelect={onImageSelect} />

        <div className="flex-1">
          <div className="flex flex-col gap-4">
            <FormInput
              label="Code"
              value={form.code}
              onChange={(e) => onChange({ code: e.target.value })}
              placeholder="Enter sub category code"
              autoFocus
            />

            <FormInput
              label="Name"
              value={form.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="Enter sub category name"
            />

            <FormInput
              label="Arabic Name"
              value={form.arabicName}
              onChange={(e) => onChange({ arabicName: e.target.value })}
              placeholder="أدخل اسم الفئة الفرعية"
            />

            <SelectInput
              label="Category"
              options={categoryOptions.map(opt => ({ label: opt.label, value: String(opt.value) }))}
              value={String(form.categoryId)}
              onChange={(e) => onChange({ categoryId: Number(e.target.value) })}
              placeholder="Choose category"
            />

            <Checkbox
              label="Active"
              checked={form.isActive}
              onChange={(e) => onChange({ isActive: e.target.checked })}
            />
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-6">
            <Button variant="secondary" onClick={onClear} disabled={saving}>
              Clear
            </Button>
            <Button onClick={onSave} disabled={saving}>
              {saving ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={15} className="animate-spin" />
                  Saving…
                </span>
              ) : (
                editingId ? "Update" : "Save"
              )}
            </Button>
            {editingId && (
              <Button
                variant="danger"
                onClick={onDelete}
                disabled={saving}
              >
                <Trash2 size={16} />
                Delete Sub Category
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SubCategoryModal;
