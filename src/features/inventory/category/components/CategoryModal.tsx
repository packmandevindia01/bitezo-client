import { Building2, Loader2, Trash2 } from "lucide-react";
import { Button, Checkbox, FormInput, ImageUploadPanel, Modal } from "../../../../components/common";
import type { BranchOption, CategoryFormState } from "../types";
import type { GroupListItem } from "../../group/types";

interface Props {
  isOpen: boolean;
  editingId: number | null;
  form: CategoryFormState;
  saving: boolean;
  branchAllocOpen: boolean;
  branchOptions: BranchOption[];
  groups: GroupListItem[];
  onClose: () => void;
  onImageSelect: (file: File | null) => void;
  onChange: (patch: Partial<CategoryFormState>) => void;
  onToggleBranchAlloc: () => void;
  onToggleBranch: (branchId: number) => void;
  onToggleGroup: (groupId: number) => void;
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
  branchOptions,
  groups,
  onClose,
  onImageSelect,
  onChange,
  onToggleBranchAlloc,
  onToggleBranch,
  onToggleGroup,
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
      footer={
        <div className="flex w-full flex-wrap justify-end gap-3 border-t border-gray-100 pt-4">
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
      }
    >
      <div className="flex flex-col gap-6 lg:flex-row">
        <ImageUploadPanel preview={form.image} onSelect={onImageSelect} />

        <div className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          <div className="mt-4 flex items-center gap-4">
            <Checkbox
              label="Active Status"
              checked={form.isActive}
              onChange={(e) => onChange({ isActive: e.target.checked })}
            />
          </div>

          {/* Group allocation panel */}
          <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/50 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Group Allocation</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {groups.length === 0 ? (
                <p className="text-xs text-gray-400">No groups available.</p>
              ) : (
                groups.map((group) => {
                  const active = form.groupIds.includes(group.grpId);
                  return (
                    <button
                      key={group.grpId}
                      type="button"
                      onClick={() => onToggleGroup(group.grpId)}
                      className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                        active
                          ? "border-[#49293e] bg-[#49293e]/10 text-[#49293e] font-medium"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 shadow-sm"
                      }`}
                    >
                      {group.name}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Branch allocation panel */}
          {branchAllocOpen && (
            <div className="mt-4 rounded-xl border border-[#49293e]/10 bg-[#49293e]/5 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#49293e]/60">Branch Allocation</p>
              <div className="mt-3 flex flex-col gap-2">
                {branchOptions.length === 0 ? (
                  <p className="text-xs text-gray-400">No branches available.</p>
                ) : (
                  branchOptions.map((branch) => {
                    const allocation = form.branchAllocations.find((b) => b.branchId === branch.id);
                    const active = !!allocation;
                    return (
                      <div key={branch.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                        <span className="text-sm font-medium text-gray-700">{branch.name}</span>
                        <button
                          type="button"
                          onClick={() => onToggleBranch(branch.id)}
                          className={`rounded-md px-4 py-1.5 text-xs transition ${
                            active
                              ? "bg-[#49293e] text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
                          }`}
                        >
                          {active ? "Allocated" : "Allocate"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default CategoryModal;