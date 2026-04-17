import { Building2, LayoutGrid, ChevronUp } from "lucide-react";
import { Button, FormInput, SelectInput } from "../../../../components/common";
import type { ExtrasMasterForm as ExtrasMasterFormType } from "../types";
import type { ExtrasTypeRecord } from "../../extrasType/types";
import type { CategoryListItem } from "../../category/types";

interface ExtrasMasterFormProps {
  form: ExtrasMasterFormType;
  isEditing: boolean;
  saving: boolean;
  loading: boolean;
  branches: { id: number; name: string }[];
  categories: CategoryListItem[];
  extrasTypes: ExtrasTypeRecord[];
  branchAllocOpen: boolean;
  categoryAllocOpen: boolean;
  onChange: <K extends keyof ExtrasMasterFormType>(
    key: K,
    value: ExtrasMasterFormType[K]
  ) => void;
  onToggleBranch: (branchId: number) => void;
  onToggleCategory: (categoryId: number) => void;
  onToggleBranchAlloc: () => void;
  onToggleCategoryAlloc: () => void;
  onClear: () => void;
  onSave: () => void;
  onCancel: () => void;
}

const ExtrasMasterForm = ({
  form,
  isEditing,
  saving,
  loading,
  branches,
  categories,
  extrasTypes,
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
}: ExtrasMasterFormProps) => {
  const typeOptions = extrasTypes.map((t) => ({
    label: t.name,
    value: String(t.typeId),
  }));

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
          <h3 className="text-lg font-bold text-gray-900">Extras Master</h3>
          <p className="text-xs text-gray-500">Configure your item extras and addons</p>
        </div>
        {isEditing && (
          <span className="rounded-full bg-[#49293e]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#49293e]">
            Editing Mode
          </span>
        )}
      </div>

      <div className="grid max-w-2xl gap-4 md:grid-cols-2">
        <FormInput
          label="Name"
          required
          placeholder="e.g. Extra Mayo"
          value={form.name}
          onChange={(e) => onChange("name", e.target.value)}
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
          options={typeOptions}
          value={form.typeId}
          placeholder="Select type"
          onChange={(e) => onChange("typeId", e.target.value)}
        />

        <FormInput
          label="Price (Incl)"
          type="number"
          step="0.001"
          placeholder="0.000"
          value={form.price}
          onChange={(e) => onChange("price", e.target.value)}
        />

        <div className="flex flex-col gap-1">
          <label className="text-xs md:text-sm font-medium text-gray-700">Display Color</label>
          <div className="flex h-[42px] items-center gap-3 rounded-lg border border-gray-300 bg-white px-3">
            <input
              type="color"
              value={form.color}
              onChange={(e) => onChange("color", e.target.value)}
              className="h-8 w-10 cursor-pointer rounded border-none bg-transparent p-0"
            />
            <span className="text-xs font-mono uppercase text-gray-500">{form.color}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          className={`flex-1 min-w-[140px] ${categoryAllocOpen ? "bg-[#49293e] text-white" : ""}`}
          onClick={onToggleCategoryAlloc}
          disabled={saving}
        >
          <LayoutGrid size={16} />
          Category ({form.categoryIds.length})
        </Button>
        <Button
          variant="secondary"
          className={`flex-1 min-w-[140px] ${branchAllocOpen ? "bg-[#49293e] text-white" : ""}`}
          onClick={onToggleBranchAlloc}
          disabled={saving}
        >
          <Building2 size={16} />
          Branches ({form.branchIds.length})
        </Button>
      </div>

      {/* Allocation Panels */}
      <div className="space-y-4 pt-4">
        {categoryAllocOpen && (
          <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-gray-900">Category Allocation</span>
              <button onClick={onToggleCategoryAlloc}><ChevronUp size={16}/></button>
            </div>
            {categories.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No categories available.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
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
                ))}
              </div>
            )}
          </div>
        )}

        {branchAllocOpen && (
          <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-gray-900">Branch Allocation</span>
              <button onClick={onToggleBranchAlloc}><ChevronUp size={16}/></button>
            </div>
            {branches.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No branches available.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {branches.map((branch) => (
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
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-end gap-3 border-t border-gray-100 pt-6">
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

export default ExtrasMasterForm;

