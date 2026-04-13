import { Loader2 } from "lucide-react";
import {
  Button,
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
}: Props) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingId ? "Edit Sub Category" : "Add Sub Category"}
      size="xl"
    >
      <section className="rounded-3xl border border-gray-200 bg-white p-2 shadow-sm md:p-3">
        <div className="flex flex-col gap-6 lg:flex-row">
          <ImageUploadPanel preview={form.image} onSelect={onImageSelect} />

          <div className="flex-1">
            <div className="grid gap-4 md:grid-cols-[200px_minmax(0,1fr)] md:items-center">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                Sub Category Code
              </p>
              <FormInput
                value={form.code}
                onChange={(e) => onChange({ code: e.target.value })}
                placeholder="Enter sub category code"
              />

              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                Sub Category Name
              </p>
              <FormInput
                value={form.name}
                onChange={(e) => onChange({ name: e.target.value })}
                placeholder="Enter sub category name"
              />

              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                Arabic Name
              </p>
              <div dir="rtl">
                <FormInput
                  value={form.arabicName}
                  onChange={(e) => onChange({ arabicName: e.target.value })}
                  placeholder="أدخل اسم الفئة الفرعية"
                />
              </div>

              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                Category Name
              </p>
              <SelectInput
                options={categoryOptions.map(opt => ({ label: opt.label, value: String(opt.value) }))}
                value={String(form.categoryId)}
                onChange={(e) => onChange({ categoryId: Number(e.target.value) })}
                placeholder="Choose category"
              />

              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                Active
              </p>
              <label className="flex cursor-pointer items-center gap-2">
                <div
                  role="switch"
                  aria-checked={form.isActive}
                  onClick={() => onChange({ isActive: !form.isActive })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.isActive ? "bg-[#49293e]" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      form.isActive ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </div>
                <span className="text-sm text-gray-700">
                  {form.isActive ? "Active" : "Inactive"}
                </span>
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
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
                  "Save"
                )}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Modal>
  );
};

export default SubCategoryModal;
