import { Button, FormInput, SelectInput } from "../../../../components/common";
import type { ModifierForm } from "../types";
import type { ModifierTypeRecord } from "../../modifierType/types";
import type { CategoryListItem } from "../../category/types";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";

interface ModifierMasterFormProps {
  form: ModifierForm;
  isEditing: boolean;
  saving?: boolean;
  loading?: boolean;
  branches: { id: number; name: string }[];
  categories: CategoryListItem[];
  modifierTypes: ModifierTypeRecord[];
  branchAllocOpen: boolean;
  categoryAllocOpen: boolean;
  onChange: <K extends keyof ModifierForm>(key: K, value: ModifierForm[K]) => void;
  onToggleBranch: (id: number) => void;
  onToggleCategory: (id: number) => void;
  onToggleBranchAlloc: () => void;
  onToggleCategoryAlloc: () => void;
  onClear: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}

const ModifierMasterForm = ({
  form,
  isEditing,
  saving = false,
  loading = false,
  branches,
  categories,
  modifierTypes,
  branchAllocOpen,
  categoryAllocOpen,
  onChange,
  onToggleBranch,
  onToggleCategory,
  onToggleBranchAlloc,
  onToggleCategoryAlloc,
  onClear,
  onSave,
  onCancel,
  onDelete,
}: ModifierMasterFormProps) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#49293e] border-t-transparent" />
        <p className="mt-4 text-sm text-gray-500">Loading details...</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Modifier Master</h3>
          <p className="text-xs text-gray-500">Configure your item modifiers and addons</p>
        </div>
        {isEditing && (
          <span className="rounded-full bg-[#49293e]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#49293e]">
            Editing Mode
          </span>
        )}
      </div>

      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Form Fields */}
          <FormInput 
            label="Name" 
            placeholder="e.g. Extra Cheese"
            required
            value={form.name} 
            onChange={(e) => onChange("name", e.target.value)} 
            autoFocus
          />
          
          <FormInput
            label="Arabic"
            placeholder="الاسم بالعربي"
            value={form.arabic}
            onChange={(e) => onChange("arabic", e.target.value)}
          />

          <SelectInput
            label="Type"
            required
            options={modifierTypes.map(t => ({ label: t.name, value: String(t.typeId) }))}
            value={form.typeId}
            placeholder="Select type"
            onChange={(e) => onChange("typeId", e.target.value)}
          />

          <FormInput
            label="Price"
            type="number"
            placeholder="0.000"
            value={form.price}
            onChange={(e) => onChange("price", e.target.value)}
          />

          <div className="flex flex-col gap-2">
             <label className="text-sm font-medium text-gray-700">Display Color</label>
             <div className="flex items-center gap-3">
               <input
                 type="color"
                 value={form.color}
                 onChange={(e) => onChange("color", e.target.value)}
                 className="h-10 w-20 cursor-pointer rounded-lg border border-gray-300 bg-white p-1"
               />
               <span className="text-xs font-mono text-gray-500 uppercase">{form.color}</span>
             </div>
          </div>
        </div>

        {/* Category Allocation Section */}
        <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
          <button
            type="button"
            onClick={onToggleCategoryAlloc}
            className="flex w-full items-center justify-between"
          >
            <div className="flex flex-col items-start px-2">
              <span className="text-sm font-bold text-gray-900">Category Allocation</span>
              <span className="text-[10px] text-gray-500">
                {form.categoryIds.length} categories selected
              </span>
            </div>
            {categoryAllocOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {categoryAllocOpen && (
            <div className="mt-4 flex flex-wrap gap-2 px-2">
              {categories.length === 0 ? (
                <p className="py-2 text-xs text-gray-400">No categories available.</p>
              ) : (
                categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => onToggleCategory(cat.id)}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                      form.categoryIds.includes(cat.id)
                        ? "bg-[#49293e] text-white shadow-md shadow-[#49293e]/20"
                        : "bg-white text-gray-600 border border-gray-200 hover:border-[#49293e]/40"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Branch Allocation Section */}
        <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
          <button
            type="button"
            onClick={onToggleBranchAlloc}
            className="flex w-full items-center justify-between"
          >
            <div className="flex flex-col items-start px-2">
              <span className="text-sm font-bold text-gray-900">Branch Allocation</span>
              <span className="text-[10px] text-gray-500">
                {form.branchIds.length} branches selected
              </span>
            </div>
            {branchAllocOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {branchAllocOpen && (
            <div className="mt-4 flex flex-wrap gap-2 px-2">
              {branches.length === 0 ? (
                <p className="py-2 text-xs text-gray-400">No branches available.</p>
              ) : (
                branches.map((branch) => (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => onToggleBranch(branch.id)}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                      form.branchIds.includes(branch.id)
                        ? "bg-[#49293e] text-white shadow-md shadow-[#49293e]/20"
                        : "bg-white text-gray-600 border border-gray-200 hover:border-[#49293e]/40"
                    }`}
                  >
                    {branch.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-6">
        {isEditing && (
          <Button
            variant="danger"
            onClick={onDelete}
            disabled={saving}
            className="mr-auto"
          >
            <Trash2 size={16} />
            Delete Modifier
          </Button>
        )}
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button variant="secondary" onClick={onClear} disabled={saving}>
          Clear
        </Button>
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : isEditing ? "Update" : "Save"}
        </Button>
      </div>
    </>
  );
};

export default ModifierMasterForm;

