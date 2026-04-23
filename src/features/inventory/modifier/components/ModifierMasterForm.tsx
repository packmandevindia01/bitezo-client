import { Trash2 } from "lucide-react";
import { Button } from "../../../../components/common";
import type { ModifierForm } from "../types";
import type { ModifierTypeRecord } from "../../modifierType/types";
import type { CategoryListItem } from "../../category/types";
import ModifierBasicFields from "./form/ModifierBasicFields";
import ModifierAllocationSections from "./form/ModifierAllocationSections";

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
      <div className="space-y-6">
        <ModifierBasicFields 
          form={form}
          modifierTypes={modifierTypes}
          onChange={onChange}
        />

        <ModifierAllocationSections 
          form={form}
          branches={branches}
          categories={categories}
          branchAllocOpen={branchAllocOpen}
          categoryAllocOpen={categoryAllocOpen}
          onToggleBranch={onToggleBranch}
          onToggleCategory={onToggleCategory}
          onToggleBranchAlloc={onToggleBranchAlloc}
          onToggleCategoryAlloc={onToggleCategoryAlloc}
        />
      </div>

      <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-6">
        <Button variant="secondary" onClick={onClear} disabled={saving}>
          Clear
        </Button>
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : isEditing ? "Update" : "Save"}
        </Button>
        {isEditing && (
          <Button
            variant="danger"
            onClick={onDelete}
            disabled={saving}
          >
            <Trash2 size={16} />
            Delete Modifier
          </Button>
        )}
      </div>
    </>
  );
};

export default ModifierMasterForm;
