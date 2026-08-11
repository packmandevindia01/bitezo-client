import { useState } from "react";
import { Building2, Save, RotateCcw, Trash2, LayoutGrid, Clock } from "lucide-react";
import { Button, Checkbox, FormInput, ImageUploadPanel, Modal } from "../../../../components/common";
import type { BranchOption } from "../types";
import type { MenuSettingsListItem } from "../../../general/menuSettings/types";
import type { UseFormReturn } from "react-hook-form";
import type { CategoryForm } from "../schemas";
import SearchBar from "../../../../components/common/SearchBar";

interface Props {
  isOpen: boolean;
  editingId: number | null;
  form: UseFormReturn<CategoryForm>;
  saving: boolean;
  branchOptions: BranchOption[];
  menuTimes: MenuSettingsListItem[];
  onClose: () => void;
  onClear: () => void;
  onSave: () => void;
  onDelete?: () => void;
}

const CategoryModal = ({
  isOpen,
  editingId,
  form,
  saving,
  branchOptions,
  menuTimes,
  onClose,
  onClear,
  onSave,
  onDelete,
}: Props) => {
  const [activeTab, setActiveTab] = useState<"general" | "menuTimes" | "branches">("general");
  const [searchMenu, setSearchMenu] = useState("");
  const [searchBranch, setSearchBranch] = useState("");

  const { register, watch, setValue, formState: { errors } } = form;

  const image = watch("image");
  const branchAllocations = watch("branchAllocations") || [];
  const menuIds = watch("menuIds") || [];
  const isActive = watch("isActive");
  const posStatus = watch("posStatus");

  const handleKeyDown = (e: React.KeyboardEvent, nextFieldId?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextFieldId) {
        document.getElementById(nextFieldId)?.focus();
      }
    }
  };

  const onToggleMenu = (menuId: number) => {
    if (menuIds.includes(menuId)) {
      setValue("menuIds", menuIds.filter((id) => id !== menuId), { shouldValidate: true, shouldDirty: true });
    } else {
      setValue("menuIds", [...menuIds, menuId], { shouldValidate: true, shouldDirty: true });
    }
  };

  const onToggleBranch = (branchId: number) => {
    const isAllocated = branchAllocations.some((b) => b.branchId === branchId);
    if (isAllocated) {
      setValue("branchAllocations", branchAllocations.filter((b) => b.branchId !== branchId), { shouldValidate: true, shouldDirty: true });
    } else {
      setValue("branchAllocations", [...branchAllocations, { branchId, colorCode: "red" }], { shouldValidate: true, shouldDirty: true });
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

  const filteredMenuTimes = menuTimes.filter(m => m.name.toLowerCase().includes(searchMenu.toLowerCase()));
  const filteredBranches = branchOptions.filter(b => b.name.toLowerCase().includes(searchBranch.toLowerCase()));

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
              onClick={() => setActiveTab("menuTimes")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all border ${
                activeTab === "menuTimes"
                  ? "bg-white text-[#49293e] border-[#49293e]/20 shadow-sm"
                  : errors.menuIds ? "bg-red-50 text-red-600 border-red-200" : "bg-transparent text-slate-500 border-transparent hover:bg-gray-100"
              }`}
            >
              <Clock size={14} />
              Menu Time Allocation <span className="text-red-500">*</span>
            </button>
            <button
              onClick={() => setActiveTab("branches")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all border ${
                activeTab === "branches"
                  ? "bg-white text-[#49293e] border-[#49293e]/20 shadow-sm"
                  : errors.branchAllocations ? "bg-red-50 text-red-600 border-red-200" : "bg-transparent text-slate-500 border-transparent hover:bg-gray-100"
              }`}
            >
              <Building2 size={14} />
              Branch Allocation <span className="text-red-500">*</span>
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-[350px]">
          {activeTab === "general" && (
            <div className="flex flex-col gap-6 lg:flex-row">
              <div className="shrink-0">
                <ImageUploadPanel preview={image} onSelect={onImageSelect} />
              </div>

              <div className="flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                  <FormInput
                    id="cat-code"
                    label="Code"
                    error={errors.code?.message}
                    {...register("code")}
                    onChange={(e) => setValue("code", e.target.value.toUpperCase().replace(/\s/g, ''), { shouldValidate: true, shouldDirty: true })}
                    onKeyDown={(e) => handleKeyDown(e, "cat-name")}
                    placeholder="Enter code"
                    required
                    readOnly
                  />

                  <FormInput
                    id="cat-name"
                    label="Name"
                    error={errors.name?.message}
                    {...register("name")}
                    onKeyDown={(e) => handleKeyDown(e, "cat-arabic")}
                    placeholder="Enter name"
                    required
                    autoFocus
                  />

                  <FormInput
                    id="cat-arabic"
                    label="Arabic Name"
                    error={errors.arabic?.message}
                    {...register("arabic")}
                    placeholder="Enter arabic name"
                    dir="rtl"
                  />
                </div>

                <div className="mt-4 flex items-center gap-6 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <Checkbox
                    label="Active Status"
                    checked={isActive}
                    onChange={(e) => setValue("isActive", e.target.checked, { shouldDirty: true })}
                  />
                  <Checkbox
                    label="Show on POS"
                    checked={posStatus}
                    onChange={(e) => setValue("posStatus", e.target.checked, { shouldDirty: true })}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "menuTimes" && (
            <div className="rounded-xl border border-[#49293e]/10 bg-[#49293e]/5 p-4 flex flex-col h-[350px]">
              {errors.menuIds?.message && (
                <p className="text-xs font-bold text-red-600 mb-3 bg-red-50 p-2 rounded-lg border border-red-200">
                  ⚠️ {errors.menuIds.message}
                </p>
              )}
              <div className="flex items-center justify-between shrink-0 mb-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#49293e]/60">Menu Time Allocation *</p>
                <div className="w-64">
                  <SearchBar 
                    value={searchMenu}
                    onChange={setSearchMenu}
                    placeholder="Search menu times..."
                  />
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-2 pb-2">
                {filteredMenuTimes.length === 0 ? (
                  <p className="text-[10px] text-gray-400">No menu times available.</p>
                ) : (
                  filteredMenuTimes.map((menu) => {
                    const active = menuIds.includes(menu.menuId);
                    return (
                      <div key={menu.menuId} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-3 shadow-sm shrink-0">
                        <span className="text-sm font-medium text-gray-700">{menu.name}</span>
                        <button
                          type="button"
                          onClick={() => onToggleMenu(menu.menuId)}
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
              {errors.branchAllocations?.message && (
                <p className="text-xs font-bold text-red-600 mb-3 bg-red-50 p-2 rounded-lg border border-red-200">
                  ⚠️ {errors.branchAllocations.message}
                </p>
              )}
              <div className="flex items-center justify-between shrink-0 mb-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#49293e]/60">Branch Allocation *</p>
                <div className="w-64">
                  <SearchBar 
                    value={searchBranch}
                    onChange={setSearchBranch}
                    placeholder="Search branches..."
                  />
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-2 pb-2">
                {filteredBranches.length === 0 ? (
                  <p className="text-[10px] text-gray-400">No branches available.</p>
                ) : (
                  filteredBranches.map((branch) => {
                    const allocation = branchAllocations.find((b) => b.branchId === branch.id);
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