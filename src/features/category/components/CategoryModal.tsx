import { Building2 } from "lucide-react";
import { Button, FormInput, ImageUploadPanel, Modal } from "../../../components/common";

interface CategoryFormState {
  code: string;
  name: string;
  image: string;
}

interface Props {
  isOpen: boolean;
  editingId: number | null;
  form: CategoryFormState;
  branchAllocOpen: boolean;
  selectedBranches: string[];
  branchOptions: string[];
  onClose: () => void;
  onImageSelect: (file: File | null) => void;
  onChange: (patch: Partial<CategoryFormState>) => void;
  onToggleBranchAlloc: () => void;
  onToggleBranch: (branch: string) => void;
  onClear: () => void;
  onSave: () => void;
}

const CategoryModal = ({
  isOpen,
  editingId,
  form,
  branchAllocOpen,
  selectedBranches,
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
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                Category Code
              </p>
              <FormInput
                value={form.code}
                onChange={(e) => onChange({ code: e.target.value })}
                placeholder="Enter category code"
              />

              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                Category Name
              </p>
              <FormInput
                value={form.name}
                onChange={(e) => onChange({ name: e.target.value })}
                placeholder="Enter category name"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                variant="secondary"
                className="bg-[#f0e8ed] text-[#49293e] hover:bg-[#e7dbe2]"
                onClick={onToggleBranchAlloc}
              >
                <Building2 size={16} />
                Branch Allocation
              </Button>
              <Button variant="secondary" onClick={onClear}>
                Clear
              </Button>
              <Button onClick={onSave}>Save</Button>
            </div>

            {branchAllocOpen && (
              <div className="mt-5 rounded-2xl border border-[#49293e]/15 bg-[#49293e]/[0.03] p-4">
                <p className="text-sm font-semibold text-gray-800">Branch Allocation</p>
                <p className="mt-1 text-xs text-gray-500">
                  Choose which branches can use this category.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {branchOptions.map((branch) => {
                    const active = selectedBranches.includes(branch);

                    return (
                      <button
                        key={branch}
                        type="button"
                        onClick={() => onToggleBranch(branch)}
                        className={`
                          rounded-full border px-4 py-2 text-sm transition
                          ${
                            active
                              ? "border-[#49293e] bg-[#49293e] text-white"
                              : "border-gray-300 bg-white text-gray-700 hover:border-[#49293e]/40"
                          }
                        `}
                      >
                        {branch}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </Modal>
  );
};

export default CategoryModal;
