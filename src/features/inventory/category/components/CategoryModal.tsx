import { Building2, Loader2 } from "lucide-react";
import { Button, FormInput, ImageUploadPanel, Modal } from "../../../../components/common";
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
}: Props) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingId ? "Edit Category" : "Add Category"}
      size="xl"
    >
      <section className="rounded-3xl border border-gray-200 bg-white p-2 shadow-sm md:p-3">
        <div className="flex flex-col gap-6 lg:flex-row">
          <ImageUploadPanel preview={form.image} onSelect={onImageSelect} />

          <div className="flex-1">
            <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
              {/* Category Code */}
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                Category Code
              </p>
              <FormInput
                value={form.code}
                onChange={(e) => onChange({ code: e.target.value })}
                placeholder="Enter category code"
                autoFocus
              />

              {/* Category Name */}
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                Category Name
              </p>
              <FormInput
                value={form.name}
                onChange={(e) => onChange({ name: e.target.value })}
                placeholder="Enter category name"
              />

              {/* Arabic Name */}
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                Arabic Name
              </p>
              <div dir="rtl">
                <FormInput
                  value={form.arabic}
                  onChange={(e) => onChange({ arabic: e.target.value })}
                  placeholder="أدخل اسم الفئة"
                />
              </div>

              {/* Active toggle */}
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

            {/* Action buttons */}
            <div className="mt-4 flex flex-wrap gap-3">
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
                  "Save"
                )}
              </Button>
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
      </section>
    </Modal>
  );
};

export default CategoryModal;