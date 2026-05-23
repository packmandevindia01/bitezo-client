import { useState } from "react";
import { Building2, Save, RotateCcw, Trash2, LayoutGrid, ListTree } from "lucide-react";
import { Button, Checkbox, FormInput, ImageUploadPanel, Modal } from "../../../../components/common";
import type { BranchOption, CategoryFormState } from "../types";
import type { GroupListItem } from "../../group/types";

interface Props {
  isOpen: boolean;
  editingId: number | null;
  form: CategoryFormState;
  saving: boolean;
  branchOptions: BranchOption[];
  groups: GroupListItem[];
  onClose: () => void;
  onImageSelect: (file: File | null) => void;
  onChange: (patch: Partial<CategoryFormState>) => void;
  onToggleBranch: (branchId: number) => void;
  onToggleGroup: (groupId: number) => void;
  onClear: () => void;
  onSave: () => void;
  onDelete?: () => void;
}

export const CategoryModal = ({
  isOpen,
  editingId,
  form,
  saving,
  branchOptions,
  groups,
  onClose,
  onImageSelect,
  onChange,
  onToggleBranch,
  onToggleGroup,
  onClear,
  onSave,
  onDelete,
}: Props) => {
  const [activeTab, setActiveTab] = useState<"general" | "groups" | "branches">("general");

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
      title={editingId ? "Edit Category" : "Add Category"}
      size="xl"
      footer={
        <div className="flex w-full flex-wrap justify-end gap-3 border-t border-gray-100 pt-4">
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
              tabIndex={-1}
              isAction
              icon={<Trash2 size={18} />}
            >
              Delete
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Custom Tab Navigation */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex w-fit gap-2 rounded-xl bg-gray-50 p-1.5 border border-gray-100">
            <button
              onClick={() => setActiveTab("general")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all border ${
                activeTab === "general"
                  ? "bg-white text-[#49293e] border-[#49293e]/20 shadow-sm"
                  : "bg-transparent text-slate-500 border-transparent hover:bg-gray-100"
              }`}
            >
              <LayoutGrid size={14} />
              General
            </button>
            <button
              onClick={() => setActiveTab("groups")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all border ${
                activeTab === "groups"
                  ? "bg-white text-[#49293e] border-[#49293e]/20 shadow-sm"
                  : "bg-transparent text-slate-500 border-transparent hover:bg-gray-100"
              }`}
            >
              <ListTree size={14} />
              Group Allocation
            </button>
            <button
              onClick={() => setActiveTab("branches")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all border ${
                activeTab === "branches"
                  ? "bg-white text-[#49293e] border-[#49293e]/20 shadow-sm"
                  : "bg-transparent text-slate-500 border-transparent hover:bg-gray-100"
              }`}
            >
              <Building2 size={14} />
              Branch Allocation
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-[350px]">
          {activeTab === "general" && (
            <div className="flex flex-col gap-6 lg:flex-row">
              <div className="shrink-0">
                <ImageUploadPanel preview={form.image} onSelect={onImageSelect} />
              </div>

              <div className="flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                  <FormInput
                    id="cat-code"
                    label="Code"
                    value={form.code}
                    onChange={(e) => onChange({ code: e.target.value.toUpperCase().replace(/\s/g, '') })}
                    onKeyDown={(e) => handleKeyDown(e, "cat-name")}
                    placeholder="Enter code"
                    required
                    autoFocus
                  />

                  <FormInput
                    id="cat-name"
                    label="Name"
                    value={form.name}
                    onChange={(e) => onChange({ name: e.target.value })}
                    onKeyDown={(e) => handleKeyDown(e, "cat-arabic")}
                    placeholder="Enter name"
                    required
                  />

                  <FormInput
                    id="cat-arabic"
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
              </div>
            </div>
          )}

          {activeTab === "groups" && (
            <div className="rounded-xl border border-[#49293e]/10 bg-[#49293e]/5 p-4 flex flex-col h-[350px]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#49293e]/60 shrink-0">Group Allocation</p>
              <div className="mt-4 flex-1 flex flex-col gap-2 overflow-y-auto pr-2 pb-2">
                {groups.length === 0 ? (
                  <p className="text-[10px] text-gray-400">No groups available.</p>
                ) : (
                  groups.map((group) => {
                    const active = form.groupIds.includes(group.grpId);
                    return (
                      <div key={group.grpId} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-3 shadow-sm shrink-0">
                        <span className="text-sm font-medium text-gray-700">{group.name}</span>
                        <button
                          type="button"
                          onClick={() => onToggleGroup(group.grpId)}
                          className={`rounded-md px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${
                            active
                              ? "bg-[#49293e] text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
                          }`}
                          tabIndex={-1}
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

          {activeTab === "branches" && (
            <div className="rounded-xl border border-[#49293e]/10 bg-[#49293e]/5 p-4 flex flex-col h-[350px]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#49293e]/60 shrink-0">Branch Allocation</p>
              <div className="mt-4 flex-1 flex flex-col gap-2 overflow-y-auto pr-2 pb-2">
                {branchOptions.length === 0 ? (
                  <p className="text-[10px] text-gray-400">No branches available.</p>
                ) : (
                  branchOptions.map((branch) => {
                    const allocation = form.branchAllocations.find((b) => b.branchId === branch.id);
                    const active = !!allocation;
                    return (
                      <div key={branch.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-3 shadow-sm shrink-0">
                        <span className="text-sm font-medium text-gray-700">{branch.name}</span>
                        <button
                          type="button"
                          onClick={() => onToggleBranch(branch.id)}
                          className={`rounded-md px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${
                            active
                              ? "bg-[#49293e] text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
                          }`}
                          tabIndex={-1}
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