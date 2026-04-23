import { Building2, Loader2, Trash2 } from "lucide-react";
import { Button, Checkbox, FormInput, ImageUploadPanel, Modal } from "../../../../components/common";
import type { BranchOption } from "../types";

interface CategoryFormState {
  code: string;
  name: string;
  arabic: string;
  isActive: boolean;
  image: string;
}

interface Props {
  isOpen: boolean;
  editingId: number | null;
  form: CategoryFormState;
  saving: boolean;
  branchAllocOpen: boolean;
  selectedBranchIds: number[];
  branchOptions: BranchOption[];
  onClose: () => void;
  onImageSelect: (file: File | null) => void;
  onChange: (patch: Partial<CategoryFormState>) => void;
  onToggleBranchAlloc: () => void;
  onToggleBranch: (branchId: number) => void;
  onClear: () => void;
  onSave: () => void;
  onDelete?: () => void;
}

const CategoryModal = ({
  isOpen,
  editingId,
  form,
  saving,
  branchAllocOpen,
  selectedBranchIds,
  branchOptions,
  onClose,
  onImageSelect,
  onChange,
  onToggleBranchAlloc,
  onToggleBranch,
  onClear,
  onSave,
  onDelete,
}: Props) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingId ? "Edit Category" : "Add Category"}
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
              placeholder="Enter category code"
              autoFocus
            />

            <FormInput
              label="Name"
              value={form.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="Enter category name"
            />

            <FormInput
              label="Arabic Name"
              value={form.arabic}
              onChange={(e) => onChange({ arabic: e.target.value })}
              placeholder="أدخل اسم الفئة"
            />

            <Checkbox
              label="Active"
              checked={form.isActive}
              onChange={(e) => onChange({ isActive: e.target.checked })}
            />
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-6">
            <Button
              variant="secondary"
              className="bg-[#f0e8ed] text-[#49293e] hover:bg-[#e7dbe2]"
              onClick={onToggleBranchAlloc}
              disabled={saving}
            >
              <Building2 size={16} />
              Branch Allocation
            </Button>
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
                Delete Category
              </Button>
            )}
          </div>

          {/* Branch allocation panel */}
          {branchAllocOpen && (
            <div className="mt-5 rounded-2xl border border-[#49293e]/15 bg-[#49293e]/3 p-4">
              <p className="text-sm font-semibold text-gray-800">Branch Allocation</p>
              <p className="mt-1 text-xs text-gray-500">
                Choose which branches can use this category.
              </p>

              {branchOptions.length === 0 ? (
                <p className="mt-4 text-xs text-gray-400">No branches available.</p>
              ) : (
                <div className="mt-4 flex flex-wrap gap-3">
                  {branchOptions.map((branch) => {
                    const active = selectedBranchIds.includes(branch.id);
                    return (
                      <button
                        key={branch.id}
                        type="button"
                        onClick={() => onToggleBranch(branch.id)}
                        className={`rounded-full border px-4 py-2 text-sm transition ${
                          active
                            ? "border-[#49293e] bg-[#49293e] text-white"
                            : "border-gray-300 bg-white text-gray-700 hover:border-[#49293e]/40"
                        }`}
                      >
                        {branch.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default CategoryModal;